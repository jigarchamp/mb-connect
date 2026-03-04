-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY & PERFORMANCE FIXES
-- Addresses Supabase dashboard advisories:
--  1. SECURITY DEFINER functions missing SET search_path (security)
--  2. auth.uid() / helper fns evaluated per-row in RLS (performance)
--  3. Missing indexes on FK columns (performance)
--  4. public_active_class_badges view returns 0 rows for anon (bug)
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SECURITY DEFINER functions: add SET search_path = ''
--    Without this, a malicious user could create a schema object that shadows
--    a built-in (e.g. a fake "profiles" table) to intercept the function.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.my_troop_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select troop_id from public.profiles where id = auth.uid();
$$;

create or replace function public.my_role()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- handle_updated_at is not SECURITY DEFINER but locking down search_path
-- is a good hygiene practice for any trigger function.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS policy optimisation: (select auth.uid()) and (select my_*())
--    When auth.uid() appears bare in a policy, Postgres re-evaluates it for
--    every row scanned. Wrapping in (select ...) turns it into a one-time
--    init-plan, which is significantly faster on large tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- TROOPS
drop policy if exists "Admins and leaders can update their troop" on troops;
create policy "Admins and leaders can update their troop"
  on troops for update
  using (id = (select my_troop_id()) and (select my_role()) in ('admin', 'leader'));

-- PROFILES
drop policy if exists "Users can view profiles in their troop" on profiles;
create policy "Users can view profiles in their troop"
  on profiles for select
  using (troop_id = (select my_troop_id()) or id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update
  using (id = (select auth.uid()));

-- INVITATIONS
drop policy if exists "Admins can manage invitations" on invitations;
create policy "Admins can manage invitations"
  on invitations for all
  using (troop_id = (select my_troop_id()) and (select my_role()) = 'admin');

-- INTERESTS
drop policy if exists "Scouts can manage their own interests" on interests;
create policy "Scouts can manage their own interests"
  on interests for all
  using (scout_id = (select auth.uid()));

drop policy if exists "Counselors and leaders can view troop interests" on interests;
create policy "Counselors and leaders can view troop interests"
  on interests for select
  using (
    (select my_role()) in ('counselor', 'leader', 'admin')
    and exists (
      select 1 from public.profiles
      where id = interests.scout_id
        and troop_id = (select my_troop_id())
    )
  );

-- COMPLETIONS
drop policy if exists "Scouts can manage their own completions" on completions;
create policy "Scouts can manage their own completions"
  on completions for all
  using (scout_id = (select auth.uid()));

drop policy if exists "Leaders and admins can view troop completions" on completions;
create policy "Leaders and admins can view troop completions"
  on completions for select
  using (
    (select my_role()) in ('leader', 'admin')
    and exists (
      select 1 from public.profiles
      where id = completions.scout_id
        and troop_id = (select my_troop_id())
    )
  );

-- CLASSES
drop policy if exists "Troop members can view open classes" on classes;
create policy "Troop members can view open classes"
  on classes for select
  using (troop_id = (select my_troop_id()) and status != 'draft');

drop policy if exists "Counselors can view their own drafts" on classes;
create policy "Counselors can view their own drafts"
  on classes for select
  using (counselor_id = (select auth.uid()));

drop policy if exists "Counselors and leaders can create classes" on classes;
create policy "Counselors and leaders can create classes"
  on classes for insert
  with check (
    counselor_id = (select auth.uid())
    and (select my_role()) in ('counselor', 'leader', 'admin')
  );

drop policy if exists "Counselors can update their own classes" on classes;
create policy "Counselors can update their own classes"
  on classes for update
  using (counselor_id = (select auth.uid()) or (select my_role()) in ('leader', 'admin'));

-- REGISTRATIONS
drop policy if exists "Scouts can manage their own registrations" on registrations;
create policy "Scouts can manage their own registrations"
  on registrations for all
  using (scout_id = (select auth.uid()));

drop policy if exists "Counselors can view registrations for their classes" on registrations;
create policy "Counselors can view registrations for their classes"
  on registrations for select
  using (
    exists (
      select 1 from public.classes
      where id = registrations.class_id
        and counselor_id = (select auth.uid())
    )
  );

drop policy if exists "Leaders and admins can view all troop registrations" on registrations;
create policy "Leaders and admins can view all troop registrations"
  on registrations for select
  using (
    (select my_role()) in ('leader', 'admin')
    and exists (
      select 1 from public.profiles
      where id = registrations.scout_id
        and troop_id = (select my_troop_id())
    )
  );

drop policy if exists "Troop members can view registrations for troop classes" on registrations;
create policy "Troop members can view registrations for troop classes"
  on registrations for select
  using (
    exists (
      select 1 from public.classes c
      where c.id = registrations.class_id
        and c.troop_id = (select my_troop_id())
    )
  );

-- NOTIFICATIONS
drop policy if exists "Users can view their own notifications" on notifications;
create policy "Users can view their own notifications"
  on notifications for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can mark their own notifications read" on notifications;
create policy "Users can mark their own notifications read"
  on notifications for update
  using (user_id = (select auth.uid()));


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Missing indexes on foreign key columns
--    PostgreSQL does NOT auto-index FK columns. Without these, JOINs and
--    cascade lookups degrade to sequential scans.
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists idx_invitations_troop_id   on invitations(troop_id);
create index if not exists idx_invitations_invited_by on invitations(invited_by);
create index if not exists idx_completions_badge_id   on completions(merit_badge_id);
create index if not exists idx_classes_counselor_id   on classes(counselor_id);
create index if not exists idx_notifications_badge_id on notifications(merit_badge_id);
create index if not exists idx_notifications_class_id on notifications(class_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Fix the open-class catalog indicator for anon users
--    The previous view (public_active_class_badges) returned 0 rows for anon
--    because the classes table RLS correctly blocks unauthenticated reads.
--    Replace it with a SECURITY DEFINER function that runs as postgres
--    (bypassing RLS) and exposes only merit_badge_id — no troop, counselor,
--    capacity, or scout data leaks.
-- ─────────────────────────────────────────────────────────────────────────────

drop view if exists public_active_class_badges;

create or replace function public.get_active_class_badge_ids()
returns table(merit_badge_id uuid)
language sql
security definer
stable
set search_path = ''
as $$
  select distinct merit_badge_id
  from public.classes
  where status in ('open', 'full');
$$;

grant execute on function public.get_active_class_badge_ids() to anon, authenticated;
