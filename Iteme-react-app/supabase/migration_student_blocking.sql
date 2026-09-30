-- Run after migration_public_programs_read.sql. Adds student blocking
-- (any staff role can block/unblock, with a reason; the student sees who
-- blocked them and why) and an admin notification feed so the CEO sees
-- when a teacher/accountant blocks someone. Permanent deletion is handled
-- separately by the delete-student Edge Function (needs the service role
-- to remove the auth.users row).

-- ── Blocking fields ──────────────────────────────────────────────
alter table profiles
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by uuid references profiles (id) on delete set null,
  add column if not exists block_reason text;

-- Lets a blocked student read the name/role of whoever blocked them,
-- without opening up cross-student profile reads generally. Uses a
-- security-definer function (not a direct subquery on profiles from
-- within a profiles policy) to avoid the classic 42P17 self-referencing
-- RLS recursion.
create or replace function public.my_blocker_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select blocked_by from profiles where id = auth.uid();
$$;

grant execute on function public.my_blocker_id() to authenticated;

create policy "Blocked students can read who blocked them"
  on profiles for select
  using (id = my_blocker_id());

-- ── Admin notifications ──────────────────────────────────────────
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  message text not null,
  actor_id uuid references profiles (id) on delete set null,
  student_id uuid references profiles (id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "Admins can read notifications"
  on notifications for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can mark notifications read"
  on notifications for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Inserts only ever happen from inside block_student/unblock_student below
-- (security definer), never directly from the client, so no client-facing
-- insert policy is needed.

-- ── block_student / unblock_student ──────────────────────────────
-- Column-scoped on purpose: staff get a function that can only touch
-- blocked_at/blocked_by/block_reason on a student row, instead of a broad
-- "staff can update any profile" RLS policy that would also let a teacher
-- edit someone's role or email.
create or replace function public.block_student(target_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  caller_name text;
  target_role text;
begin
  select role, full_name into caller_role, caller_name from profiles where id = auth.uid();
  if caller_role not in ('teacher', 'admin', 'accountant') then
    raise exception 'Only staff can block a student';
  end if;

  select role into target_role from profiles where id = target_id;
  if target_role is distinct from 'student' then
    raise exception 'Can only block student accounts';
  end if;

  update profiles
  set blocked_at = now(), blocked_by = auth.uid(), block_reason = reason
  where id = target_id;

  if caller_role <> 'admin' then
    insert into notifications (type, message, actor_id, student_id)
    values (
      'student_blocked',
      caller_name || ' (' || caller_role || ') blocked a student' ||
        case when reason is not null and reason <> '' then ': ' || reason else '' end,
      auth.uid(),
      target_id
    );
  end if;
end;
$$;

grant execute on function public.block_student(uuid, text) to authenticated;

create or replace function public.unblock_student(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  caller_name text;
begin
  select role, full_name into caller_role, caller_name from profiles where id = auth.uid();
  if caller_role not in ('teacher', 'admin', 'accountant') then
    raise exception 'Only staff can unblock a student';
  end if;

  update profiles
  set blocked_at = null, blocked_by = null, block_reason = null
  where id = target_id;

  if caller_role <> 'admin' then
    insert into notifications (type, message, actor_id, student_id)
    values (
      'student_unblocked',
      caller_name || ' (' || caller_role || ') unblocked a student',
      auth.uid(),
      target_id
    );
  end if;
end;
$$;

grant execute on function public.unblock_student(uuid) to authenticated;
