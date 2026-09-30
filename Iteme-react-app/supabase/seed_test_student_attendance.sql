-- Seeds attendance data for a specific student, and approves their
-- application (simulating what happens once the dashboard owner/admin
-- approves it). Run this in the Supabase SQL Editor.
--
-- Auto-detects the student's program + session from their existing
-- active enrollment, so it works no matter which program they applied to.
-- Safe to re-run (uses ON CONFLICT to avoid duplicates).

do $$
declare
  target_student uuid := '24920756-9066-4ea1-9985-de9e9acf93e4';
  target_program text;
  target_session text;
begin
  select program_id, session
  into target_program, target_session
  from enrollments
  where student_id = target_student and status = 'active'
  limit 1;

  if target_program is null then
    raise notice 'No active enrollment found for student %. They need to apply to a program first, then re-run this script.', target_student;
    return;
  end if;

  -- Create five class sessions on their program/session if they don't exist yet
  insert into class_sessions (program_id, session, session_date, topic)
  values
    (target_program, target_session, current_date - interval '14 days', 'Orientation'),
    (target_program, target_session, current_date - interval '10 days', 'Fundamentals'),
    (target_program, target_session, current_date - interval '7 days', 'Studio Practice'),
    (target_program, target_session, current_date - interval '3 days', 'Review Session'),
    (target_program, target_session, current_date - interval '1 days', 'Group Critique')
  on conflict (program_id, session, session_date) do nothing;

  -- Mark this student's attendance across those sessions
  insert into attendance (class_session_id, student_id, status, marked_at)
  select
    cs.id,
    target_student,
    case cs.topic
      when 'Orientation' then 'present'
      when 'Fundamentals' then 'present'
      when 'Studio Practice' then 'late'
      when 'Review Session' then 'absent'
      when 'Group Critique' then 'present'
    end,
    now()
  from class_sessions cs
  where cs.program_id = target_program
    and cs.session = target_session
    and cs.topic in ('Orientation', 'Fundamentals', 'Studio Practice', 'Review Session', 'Group Critique')
  on conflict (class_session_id, student_id)
  do update set status = excluded.status, marked_at = excluded.marked_at;

  -- Approve their application — comment this out if you want to test
  -- the "Pending Approval" state instead.
  update enrollments
  set approval_status = 'approved'
  where student_id = target_student and status = 'active';

  raise notice 'Seeded attendance and approved enrollment for student % (program: %, session: %)', target_student, target_program, target_session;
end $$;
