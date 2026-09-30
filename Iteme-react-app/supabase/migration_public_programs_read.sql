-- Fixes: public /programs and /programs/:id pages show nothing for
-- anonymous visitors.
--
-- schema.sql's original "Anyone signed in can read programs" policy
-- requires auth.role() = 'authenticated', which was fine when programs
-- were static frontend data and the DB row only existed to satisfy
-- enrollment/class_session foreign keys. Now that the public marketing
-- pages fetch programs live from Supabase (see src/hooks/usePrograms.js),
-- that policy blocks every logged-out visitor.
--
-- Adds a second, permissive policy for anon + authenticated readers,
-- scoped to active programs only — archived programs stay invisible to
-- the public API even though the client already filters them client-side.

create policy "Anyone can read active programs"
  on programs for select
  using (active = true);
