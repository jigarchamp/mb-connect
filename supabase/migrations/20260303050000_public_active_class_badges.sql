-- Expose a minimal public view that shows only which merit badge IDs have
-- at least one class currently open for enrollment (status 'open' or 'full').
-- No troop, counselor, capacity, or scout data is exposed.
-- Guests can use this to see the "Class available" indicator on catalog cards.

create view public_active_class_badges as
  select distinct merit_badge_id
  from classes
  where status in ('open', 'full');

-- Grant read access to unauthenticated (anon) and authenticated users
grant select on public_active_class_badges to anon, authenticated;
