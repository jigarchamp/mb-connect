-- Rebuild troop_mb_demand with two new columns:
--   unmet_count  — scouts who wishlisted the badge but are NOT yet enrolled
--                  (registered or waitlisted) in any active class for it
--   has_open_class — whether at least one open/full/in_progress class already
--                    exists for this badge in the troop

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
  count(i.id)       as interest_count,

  -- Scouts with unmet demand: wishlisted but not enrolled in any active class
  count(i.id) filter (
    where not exists (
      select 1
      from   public.registrations r
      join   public.classes       c on c.id = r.class_id
      where  r.scout_id        = i.scout_id
        and  c.merit_badge_id  = i.merit_badge_id
        and  r.status         in ('registered', 'waitlisted')
        and  c.status     not in ('closed', 'cancelled')
    )
  )                 as unmet_count,

  -- Whether at least one active class already covers this badge in the troop
  exists (
    select 1
    from   public.classes c
    where  c.merit_badge_id = i.merit_badge_id
      and  c.troop_id       = p.troop_id
      and  c.status        in ('open', 'full', 'in_progress')
  )                 as has_open_class

from   public.interests    i
join   public.profiles     p  on p.id  = i.scout_id
join   public.merit_badges mb on mb.id = i.merit_badge_id
group  by i.merit_badge_id, mb.name, mb.eagle_required, mb.category, p.troop_id;
