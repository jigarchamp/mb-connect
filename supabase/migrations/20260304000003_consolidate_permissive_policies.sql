-- ─────────────────────────────────────────────────────────────────────────────
-- CONSOLIDATE MULTIPLE PERMISSIVE SELECT POLICIES
--
-- When a table has multiple permissive policies covering the same action and
-- role, Postgres evaluates every one of them for every query — even though
-- access is granted as soon as the first one passes. This migration merges all
-- overlapping SELECT policies into exactly one SELECT policy per table, and
-- splits the old FOR ALL policies into separate INSERT / UPDATE / DELETE
-- policies so they no longer contribute a second SELECT path.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- MERIT BADGES: drop stale duplicate, keep one policy for anon + authenticated
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Public can view merit badges"            on merit_badges;
drop policy if exists "Authenticated users can view merit badges" on merit_badges;
drop policy if exists "Anyone can view merit badges"            on merit_badges;

create policy "Anyone can view merit badges"
  on merit_badges for select
  to anon, authenticated
  using (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- INVITATIONS: split FOR ALL into write-only; existing SELECT policy stays
-- "Anyone authenticated can read invitation by token" (SELECT, using(true))
-- is the sole SELECT policy after this.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Admins can manage invitations" on invitations;

create policy "Admins can insert invitations"
  on invitations for insert
  to authenticated
  with check (troop_id = (select my_troop_id()) and (select my_role()) = 'admin');

create policy "Admins can update invitations"
  on invitations for update
  to authenticated
  using  (troop_id = (select my_troop_id()) and (select my_role()) = 'admin');

create policy "Admins can delete invitations"
  on invitations for delete
  to authenticated
  using  (troop_id = (select my_troop_id()) and (select my_role()) = 'admin');


-- ─────────────────────────────────────────────────────────────────────────────
-- INTERESTS
-- Old: FOR ALL (scouts) + FOR SELECT (counselors/leaders) → 2 SELECT policies
-- New: FOR INSERT + FOR DELETE (scouts only) + one merged FOR SELECT
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Scouts can manage their own interests"          on interests;
drop policy if exists "Counselors and leaders can view troop interests" on interests;

create policy "Scouts can insert their own interests"
  on interests for insert
  to authenticated
  with check (scout_id = (select auth.uid()));

create policy "Scouts can delete their own interests"
  on interests for delete
  to authenticated
  using (scout_id = (select auth.uid()));

create policy "Users can view interests"
  on interests for select
  to authenticated
  using (
    scout_id = (select auth.uid())
    or (
      (select my_role()) in ('counselor', 'leader', 'admin')
      and exists (
        select 1 from public.profiles
        where id = interests.scout_id
          and troop_id = (select my_troop_id())
      )
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- COMPLETIONS
-- Old: FOR ALL (scouts) + FOR SELECT (leaders/admins) → 2 SELECT policies
-- New: FOR INSERT + FOR UPDATE + FOR DELETE (scouts only) + one merged SELECT
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Scouts can manage their own completions"    on completions;
drop policy if exists "Leaders and admins can view troop completions" on completions;

create policy "Scouts can insert their own completions"
  on completions for insert
  to authenticated
  with check (scout_id = (select auth.uid()));

create policy "Scouts can update their own completions"
  on completions for update
  to authenticated
  using  (scout_id = (select auth.uid()))
  with check (scout_id = (select auth.uid()));

create policy "Scouts can delete their own completions"
  on completions for delete
  to authenticated
  using (scout_id = (select auth.uid()));

create policy "Users can view completions"
  on completions for select
  to authenticated
  using (
    scout_id = (select auth.uid())
    or (
      (select my_role()) in ('leader', 'admin')
      and exists (
        select 1 from public.profiles
        where id = completions.scout_id
          and troop_id = (select my_troop_id())
      )
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- CLASSES
-- Old: "Troop members can view open classes" + "Counselors can view their own
--      drafts" → 2 SELECT policies
-- New: one merged SELECT policy
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Troop members can view open classes"  on classes;
drop policy if exists "Counselors can view their own drafts" on classes;

create policy "Users can view classes"
  on classes for select
  to authenticated
  using (
    (troop_id = (select my_troop_id()) and status != 'draft')
    or counselor_id = (select auth.uid())
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- REGISTRATIONS
-- Old: FOR ALL (scouts) + 3 × FOR SELECT (counselors, leaders, troop members)
--      → 4 SELECT policies
-- New: FOR INSERT + FOR UPDATE + FOR DELETE (scouts only) + one merged SELECT
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Scouts can manage their own registrations"          on registrations;
drop policy if exists "Counselors can view registrations for their classes" on registrations;
drop policy if exists "Leaders and admins can view all troop registrations" on registrations;
drop policy if exists "Troop members can view registrations for troop classes" on registrations;

create policy "Scouts can insert their own registrations"
  on registrations for insert
  to authenticated
  with check (scout_id = (select auth.uid()));

create policy "Scouts can update their own registrations"
  on registrations for update
  to authenticated
  using  (scout_id = (select auth.uid()))
  with check (scout_id = (select auth.uid()));

create policy "Scouts can delete their own registrations"
  on registrations for delete
  to authenticated
  using (scout_id = (select auth.uid()));

create policy "Users can view registrations"
  on registrations for select
  to authenticated
  using (
    -- scout sees their own
    scout_id = (select auth.uid())
    -- counselor sees registrations for their classes
    or exists (
      select 1 from public.classes
      where id = registrations.class_id
        and counselor_id = (select auth.uid())
    )
    -- leader/admin sees all registrations within their troop
    or (
      (select my_role()) in ('leader', 'admin')
      and exists (
        select 1 from public.profiles
        where id = registrations.scout_id
          and troop_id = (select my_troop_id())
      )
    )
    -- any troop member sees enrollment counts for their troop's classes
    or exists (
      select 1 from public.classes c
      where c.id = registrations.class_id
        and c.troop_id = (select my_troop_id())
    )
  );
