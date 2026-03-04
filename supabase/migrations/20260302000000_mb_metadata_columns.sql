-- Add metadata columns to merit_badges (issue #8)
alter table merit_badges
  add column if not exists min_age       integer,
  add column if not exists min_rank      text check (min_rank in ('scout', 'tenderfoot', 'second_class', 'first_class', 'star', 'life', 'eagle')),
  add column if not exists difficulty    integer check (difficulty between 1 and 5),
  add column if not exists typical_weeks integer,
  add column if not exists bsa_url       text,
  add column if not exists worksheet_url text;

-- Allow unauthenticated (anon) users to read the public MB catalog.
-- The existing policy is scoped to `authenticated` only, which blocks
-- the public homepage catalog and the detail page for guests.
create policy "Public can view merit badges"
  on merit_badges for select
  to anon
  using (true);
