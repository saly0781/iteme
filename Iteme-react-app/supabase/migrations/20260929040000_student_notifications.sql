-- Students had zero visibility into their own payment history, and there
-- was no way for staff to message an individual student. This is the
-- opposite direction from the existing `notifications` table (that one is
-- admin-facing, fed by block_student/unblock_student) — a new table with
-- its own lifecycle is needed, not an extension of it.

-- ── Students can read their own payments ──────────────────────────
create policy "Students can read their own payments"
  on payments for select
  using (
    exists (
      select 1 from enrollments
      where enrollments.id = payments.enrollment_id
        and enrollments.student_id = auth.uid()
    )
  );

-- ── student_notifications ──────────────────────────────────────────
create table if not exists student_notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  sent_by uuid references profiles (id) on delete set null,
  type text not null default 'staff' check (type in ('system', 'staff')),
  message text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  dismissed_at timestamptz
);

alter table student_notifications enable row level security;

create policy "Students can read their own notifications"
  on student_notifications for select
  using (auth.uid() = student_id);

create policy "Staff can read all student notifications"
  on student_notifications for select
  using (is_staff());

create policy "Staff can send student notifications"
  on student_notifications for insert
  with check (is_staff());

-- Column-scoped RPCs (same pattern as block_student/unblock_student in
-- migration_student_blocking.sql) so a student can only ever touch
-- seen_at/dismissed_at on their own row — never the message or sender.
create or replace function public.mark_notification_seen(notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update student_notifications
  set seen_at = coalesce(seen_at, now())
  where id = notification_id and student_id = auth.uid();
end;
$$;

grant execute on function public.mark_notification_seen(uuid) to authenticated;

create or replace function public.dismiss_notification(notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update student_notifications
  set dismissed_at = now(), seen_at = coalesce(seen_at, now())
  where id = notification_id and student_id = auth.uid();
end;
$$;

grant execute on function public.dismiss_notification(uuid) to authenticated;
