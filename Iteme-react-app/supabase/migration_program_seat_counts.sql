-- Run after migration_programs.sql. Lets the public site and student
-- dashboard show live "X applied / Y seats" without granting anyone read
-- access to the enrollments table itself (which holds student PII). Only
-- aggregate counts are exposed, never rows.

create or replace function public.program_seat_counts()
returns table (program_id text, session text, applied bigint)
language sql
security definer
set search_path = public
stable
as $$
  select program_id, session, count(*)::bigint as applied
  from enrollments
  where status = 'active' and approval_status = 'approved'
  group by program_id, session;
$$;

grant execute on function public.program_seat_counts() to anon, authenticated;
