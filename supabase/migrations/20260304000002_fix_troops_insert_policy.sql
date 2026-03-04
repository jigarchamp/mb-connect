-- The "Authenticated users can create a troop" policy has WITH CHECK (true),
-- which flags as rls_policy_always_true. The only code path that creates troops
-- is the createTroop server action, which uses the service-role client and
-- bypasses RLS entirely. The policy is therefore unused for legitimate flows
-- and only adds attack surface via the REST API. Drop it.

drop policy if exists "Authenticated users can create a troop" on troops;
