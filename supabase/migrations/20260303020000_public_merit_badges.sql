-- Allow unauthenticated (anon) users to read the merit badge catalog.
-- The BSA merit badge list is fully public information — no auth required
-- to browse badges or view detail pages.

drop policy if exists "Authenticated users can view merit badges" on merit_badges;

create policy "Anyone can view merit badges"
  on merit_badges for select
  to anon, authenticated
  using (true);
