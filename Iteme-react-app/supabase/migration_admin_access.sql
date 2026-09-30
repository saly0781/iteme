-- Run this once in the Supabase SQL editor. Grants teacher/admin accounts
-- the access the new staff console (Iteme-admin) needs: reading every
-- student's profile/enrollments, approving or rejecting applications, and
-- managing the class schedule. Attendance already had teacher/admin
-- policies from schema.sql — nothing to add there.

-- is_staff() runs as SECURITY DEFINER so its internal read of profiles
-- bypasses RLS entirely. Without this, a policy on profiles that queries
-- profiles from within its own USING clause recurses infinitely (42P17) --
-- and since the select policy would block every read, including your own
-- login's profile fetch.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('teacher', 'admin')
  );
$$;

grant execute on function public.is_staff() to authenticated;

-- ── Profiles ─────────────────────────────────────────────────────
create policy "Teachers and admins can read all profiles"
  on profiles for select
  using (is_staff());

-- ── Enrollments ──────────────────────────────────────────────────
create policy "Teachers and admins can read all enrollments"
  on enrollments for select
  using (is_staff());

create policy "Teachers and admins can update all enrollments"
  on enrollments for update
  using (is_staff());

-- ── Class sessions ───────────────────────────────────────────────
create policy "Teachers and admins can write class sessions"
  on class_sessions for insert
  with check (is_staff());

create policy "Teachers and admins can update class sessions"
  on class_sessions for update
  using (is_staff());

create policy "Teachers and admins can delete class sessions"
  on class_sessions for delete
  using (is_staff());

-- ── Promote a test account to staff ─────────────────────────────
-- Run manually after a teacher/admin signs up through the student app once
-- (there's no separate staff signup form — the console is login-only):
--
--   update profiles set role = 'admin' where email = 'someone@example.com';
