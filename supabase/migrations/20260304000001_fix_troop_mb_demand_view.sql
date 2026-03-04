-- troop_mb_demand was created by the postgres superuser, which implicitly gives
-- it SECURITY DEFINER semantics (runs as postgres, bypasses RLS). Recreate it
-- with security_invoker = on so it uses the calling user's RLS policies instead.
-- Counselors/leaders/admins can already see troop interests via existing policies,
-- so the view data is unchanged — it just now correctly enforces row-level access.

drop view if exists troop_mb_demand;

create view troop_mb_demand
  with (security_invoker = on)
as
select
  i.merit_badge_id,
  mb.name           as merit_badge_name,
  mb.eagle_required,
  mb.category,
  p.troop_id,
  count(i.id)       as interest_count
from interests i
join profiles p     on p.id = i.scout_id
join merit_badges mb on mb.id = i.merit_badge_id
group by i.merit_badge_id, mb.name, mb.eagle_required, mb.category, p.troop_id;
