-- ─────────────────────────────────────────
-- CLEAN SLATE: drop any tables from previous attempt
-- ─────────────────────────────────────────
drop table if exists "ClassSignup" cascade;
drop table if exists "CompletedMeritBadge" cascade;
drop table if exists "MeritBadgeClass" cascade;
drop table if exists "CounselorMeritBadge" cascade;
drop table if exists "UserMeritBadgeInterest" cascade;
drop table if exists "UserRelationship" cascade;
drop table if exists "User" cascade;
drop table if exists "MeritBadge" cascade;
drop table if exists "Troop" cascade;
drop type if exists "Role" cascade;
drop type if exists "Rank" cascade;
drop type if exists "RelationshipType" cascade;
drop type if exists "MeritBadgeDifficulty" cascade;
drop type if exists "Seasonality" cascade;
drop type if exists "TimingPreference" cascade;
drop type if exists "ClassStatus" cascade;
drop type if exists "ClassSignupStatus" cascade;

-- ─────────────────────────────────────────
-- TROOPS
-- ─────────────────────────────────────────
create table troops (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  unit_number   text        not null,
  council_name  text,
  city          text,
  state         text,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────
create table profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  troop_id      uuid        references troops(id),
  role          text        not null check (role in ('scout', 'counselor', 'leader', 'admin')),
  first_name    text        not null,
  last_name     text        not null,
  phone         text,
  rank          text        check (rank in ('scout', 'tenderfoot', 'second_class', 'first_class', 'star', 'life', 'eagle')),
  bsa_member_id text,
  date_of_birth date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- INVITATIONS
-- ─────────────────────────────────────────
create table invitations (
  id          uuid        primary key default gen_random_uuid(),
  troop_id    uuid        not null references troops(id),
  email       text        not null,
  role        text        not null check (role in ('scout', 'counselor', 'leader', 'admin')),
  invited_by  uuid        references profiles(id),
  token       text        unique not null default gen_random_uuid()::text,
  invited_at  timestamptz default now(),
  accepted_at timestamptz
);

-- ─────────────────────────────────────────
-- MERIT BADGES (global catalog — seeded, not user-created)
-- ─────────────────────────────────────────
create table merit_badges (
  id             uuid        primary key default gen_random_uuid(),
  bsa_badge_id   text,
  name           text        not null unique,
  description    text,
  eagle_required boolean     default false,
  category       text        not null,
  requirements   jsonb,
  image_url      text,
  created_at     timestamptz default now()
);

-- ─────────────────────────────────────────
-- INTERESTS (scout wishlist — no class required)
-- ─────────────────────────────────────────
create table interests (
  id              uuid        primary key default gen_random_uuid(),
  scout_id        uuid        not null references profiles(id) on delete cascade,
  merit_badge_id  uuid        not null references merit_badges(id) on delete cascade,
  created_at      timestamptz default now(),
  unique(scout_id, merit_badge_id)
);

-- ─────────────────────────────────────────
-- COMPLETIONS (self-reported by scout)
-- ─────────────────────────────────────────
create table completions (
  id              uuid        primary key default gen_random_uuid(),
  scout_id        uuid        not null references profiles(id) on delete cascade,
  merit_badge_id  uuid        not null references merit_badges(id) on delete cascade,
  completed_date  date,
  counselor_name  text,
  source          text        not null default 'manual' check (source in ('manual', 'scoutbook_import')),
  notes           text,
  created_at      timestamptz default now(),
  unique(scout_id, merit_badge_id)
);

-- ─────────────────────────────────────────
-- CLASSES
-- ─────────────────────────────────────────
create table classes (
  id              uuid        primary key default gen_random_uuid(),
  troop_id        uuid        not null references troops(id),
  merit_badge_id  uuid        not null references merit_badges(id),
  counselor_id    uuid        not null references profiles(id),
  description     text,
  location        text,
  location_type   text        not null default 'in_person' check (location_type in ('in_person', 'virtual', 'hybrid')),
  session_date    date        not null,
  session_time    time,
  duration_hours  numeric,
  capacity        integer,
  status          text        not null default 'open' check (status in ('draft', 'open', 'full', 'closed', 'cancelled')),
  prerequisites   text,
  materials       text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- REGISTRATIONS
-- ─────────────────────────────────────────
create table registrations (
  id            uuid        primary key default gen_random_uuid(),
  scout_id      uuid        not null references profiles(id) on delete cascade,
  class_id      uuid        not null references classes(id) on delete cascade,
  status        text        not null default 'registered' check (status in ('registered', 'waitlisted', 'cancelled')),
  registered_at timestamptz default now(),
  unique(scout_id, class_id)
);

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────
create table notifications (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references profiles(id) on delete cascade,
  type            text        not null check (type in ('class_opened', 'class_reminder', 'waitlist_available')),
  merit_badge_id  uuid        references merit_badges(id),
  class_id        uuid        references classes(id),
  message         text,
  sent_at         timestamptz default now(),
  read_at         timestamptz
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
create index idx_profiles_troop_id       on profiles(troop_id);
create index idx_interests_scout_id      on interests(scout_id);
create index idx_interests_badge_id      on interests(merit_badge_id);
create index idx_completions_scout_id    on completions(scout_id);
create index idx_classes_troop_id        on classes(troop_id);
create index idx_classes_badge_id        on classes(merit_badge_id);
create index idx_classes_status          on classes(status);
create index idx_registrations_class_id  on registrations(class_id);
create index idx_registrations_scout_id  on registrations(scout_id);
create index idx_notifications_user_id   on notifications(user_id);

-- ─────────────────────────────────────────
-- DEMAND VIEW (counselor dashboard)
-- ─────────────────────────────────────────
create view troop_mb_demand as
select
  i.merit_badge_id,
  mb.name           as merit_badge_name,
  mb.eagle_required,
  mb.category,
  p.troop_id,
  count(i.id)       as interest_count
from interests i
join profiles p    on p.id = i.scout_id
join merit_badges mb on mb.id = i.merit_badge_id
group by i.merit_badge_id, mb.name, mb.eagle_required, mb.category, p.troop_id;

-- ─────────────────────────────────────────
-- TRIGGERS: updated_at
-- ─────────────────────────────────────────
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure handle_updated_at();

create trigger classes_updated_at
  before update on classes
  for each row execute procedure handle_updated_at();

-- ─────────────────────────────────────────
-- TRIGGER: auto-create profile on signup
-- ─────────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, first_name, last_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'scout')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table troops        enable row level security;
alter table profiles      enable row level security;
alter table invitations   enable row level security;
alter table merit_badges  enable row level security;
alter table interests     enable row level security;
alter table completions   enable row level security;
alter table classes       enable row level security;
alter table registrations enable row level security;
alter table notifications enable row level security;

-- Helper: current user's troop
create or replace function my_troop_id()
returns uuid as $$
  select troop_id from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Helper: current user's role
create or replace function my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- TROOPS
create policy "Users can view their own troop"
  on troops for select
  using (id = my_troop_id());

-- PROFILES
create policy "Users can view profiles in their troop"
  on profiles for select
  using (troop_id = my_troop_id() or id = auth.uid());

create policy "Users can update their own profile"
  on profiles for update
  using (id = auth.uid());

create policy "System can insert profiles"
  on profiles for insert
  with check (id = auth.uid());

-- INVITATIONS
create policy "Admins can manage invitations"
  on invitations for all
  using (troop_id = my_troop_id() and my_role() = 'admin');

create policy "Anyone authenticated can read invitation by token"
  on invitations for select
  to authenticated
  using (true);

-- MERIT BADGES (global read for all authenticated users)
create policy "Authenticated users can view merit badges"
  on merit_badges for select
  to authenticated
  using (true);

-- INTERESTS
create policy "Scouts can manage their own interests"
  on interests for all
  using (scout_id = auth.uid());

create policy "Counselors and leaders can view troop interests"
  on interests for select
  using (
    my_role() in ('counselor', 'leader', 'admin')
    and exists (
      select 1 from profiles
      where id = interests.scout_id
      and troop_id = my_troop_id()
    )
  );

-- COMPLETIONS
create policy "Scouts can manage their own completions"
  on completions for all
  using (scout_id = auth.uid());

create policy "Leaders and admins can view troop completions"
  on completions for select
  using (
    my_role() in ('leader', 'admin')
    and exists (
      select 1 from profiles
      where id = completions.scout_id
      and troop_id = my_troop_id()
    )
  );

-- CLASSES
create policy "Troop members can view open classes"
  on classes for select
  using (troop_id = my_troop_id() and status != 'draft');

create policy "Counselors can view their own drafts"
  on classes for select
  using (counselor_id = auth.uid());

create policy "Counselors and leaders can create classes"
  on classes for insert
  with check (
    counselor_id = auth.uid()
    and my_role() in ('counselor', 'leader', 'admin')
  );

create policy "Counselors can update their own classes"
  on classes for update
  using (counselor_id = auth.uid() or my_role() in ('leader', 'admin'));

-- REGISTRATIONS
create policy "Scouts can manage their own registrations"
  on registrations for all
  using (scout_id = auth.uid());

create policy "Counselors can view registrations for their classes"
  on registrations for select
  using (
    exists (
      select 1 from classes
      where id = registrations.class_id
      and counselor_id = auth.uid()
    )
  );

create policy "Leaders and admins can view all troop registrations"
  on registrations for select
  using (
    my_role() in ('leader', 'admin')
    and exists (
      select 1 from profiles
      where id = registrations.scout_id
      and troop_id = my_troop_id()
    )
  );

-- NOTIFICATIONS
create policy "Users can view their own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "Users can mark their own notifications read"
  on notifications for update
  using (user_id = auth.uid());
