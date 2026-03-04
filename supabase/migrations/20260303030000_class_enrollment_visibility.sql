-- Allow troop members to see all registrations for their troop's classes.
-- This is needed to compute enrollment counts ("X spots left") on class cards.
-- Individual scout identity is not sensitive within a troop context.

create policy "Troop members can view registrations for troop classes"
  on registrations for select
  using (
    exists (
      select 1 from classes c
      where c.id = registrations.class_id
        and c.troop_id = my_troop_id()
    )
  );
