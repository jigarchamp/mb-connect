-- SECURITY DEFINER function to expose upcoming classes publicly.
-- Bypasses troop-scoped RLS so all open/full classes across all troops are
-- visible without a user session. Only exposes columns needed for the
-- public /classes listing page.

create or replace function public.get_upcoming_classes()
returns table (
  id                   uuid,
  merit_badge_id       uuid,
  badge_name           text,
  category             text,
  session_date         date,
  sessions_count       integer,
  capacity             integer,
  status               text,
  counselor_first_name text,
  counselor_last_name  text,
  enrolled_count       bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.id,
    c.merit_badge_id,
    mb.name                                              as badge_name,
    mb.category,
    c.session_date,
    c.sessions_count,
    c.capacity,
    c.status,
    p.first_name                                         as counselor_first_name,
    p.last_name                                          as counselor_last_name,
    count(r.id) filter (where r.status = 'registered')  as enrolled_count
  from   public.classes           c
  join   public.merit_badges      mb on mb.id = c.merit_badge_id
  join   public.profiles          p  on p.id  = c.counselor_id
  left   join public.registrations r on r.class_id = c.id
  where  c.status in ('open', 'full')
  group  by c.id, mb.name, mb.category, p.first_name, p.last_name
  order  by c.session_date asc;
$$;

grant execute on function public.get_upcoming_classes() to anon, authenticated;
