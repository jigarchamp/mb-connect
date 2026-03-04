-- Allow any authenticated user to create a troop (admin bootstrap flow)
create policy "Authenticated users can create a troop"
  on troops for insert
  to authenticated
  with check (true);

-- Allow admins and leaders to update troop details
create policy "Admins and leaders can update their troop"
  on troops for update
  using (id = my_troop_id() and my_role() in ('admin', 'leader'));
