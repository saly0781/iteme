-- Lets a logged-out student request a password reset from the login screen.
-- Rather than emailing a reset link (this project has no SMTP configured),
-- it drops a notification into the existing admin notifications feed (the
-- same table/bell used for student_blocked/student_unblocked — see
-- migration_student_blocking.sql) so an admin can reach out and reset the
-- account by hand.
--
-- Always succeeds from the caller's point of view regardless of whether the
-- identifier matched a real account, so this can't be used to enumerate
-- which emails/phones/Student IDs belong to real accounts.
create or replace function public.request_password_reset(identifier text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  target_name text;
  target_email text;
begin
  select id, full_name, email into target_id, target_name, target_email
  from profiles
  where email = identifier or phone = identifier or student_code = identifier
  limit 1;

  if target_id is not null then
    insert into notifications (type, message, student_id)
    values (
      'password_reset_request',
      target_name || ' (' || target_email || ') requested a password reset.',
      target_id
    );
  end if;
end;
$$;

grant execute on function public.request_password_reset(text) to anon, authenticated;
