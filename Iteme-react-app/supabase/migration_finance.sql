-- Run this once in the Supabase SQL editor. Adds the 'accountant' role and
-- a finance module (payments received + expenses) for the accountant/CEO
-- (admin) roles. Teachers stay locked out of all financial data; writing to
-- enrollments/schedule/attendance stays restricted to is_staff() (teacher +
-- admin), unchanged from migration_admin_access.sql.

-- ── Role model ───────────────────────────────────────────────────
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin', 'accountant'));

-- ── Broader read access for org-facing staff ────────────────────
-- Teachers need the student roster for attendance; accountants need it to
-- attach payments to the right student/program. This only widens SELECT —
-- writes to enrollments/class_sessions/attendance still require is_staff().
create or replace function public.can_view_org_data()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('teacher', 'admin', 'accountant')
  );
$$;

grant execute on function public.can_view_org_data() to authenticated;

drop policy if exists "Teachers and admins can read all profiles" on profiles;
create policy "Staff can read all profiles"
  on profiles for select
  using (can_view_org_data());

drop policy if exists "Teachers and admins can read all enrollments" on enrollments;
create policy "Staff can read all enrollments"
  on enrollments for select
  using (can_view_org_data());

-- ── Finance role (accountant + admin only) ───────────────────────
create or replace function public.is_finance()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'accountant')
  );
$$;

grant execute on function public.is_finance() to authenticated;

-- ── Payments ─────────────────────────────────────────────────────
-- Money received from a student (tuition installments, fees), tied to
-- their enrollment.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null check (method in ('mobile_money', 'card', 'cash', 'bank_transfer')),
  note text,
  paid_at date not null default current_date,
  recorded_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table payments enable row level security;

create policy "Finance roles can read payments"
  on payments for select
  using (is_finance());

create policy "Finance roles can write payments"
  on payments for insert
  with check (is_finance());

create policy "Finance roles can update payments"
  on payments for update
  using (is_finance());

create policy "Finance roles can delete payments"
  on payments for delete
  using (is_finance());

-- ── Expenses ─────────────────────────────────────────────────────
-- Money spent by the school (rent, salaries, equipment, etc.) — not tied
-- to any student.
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in ('rent', 'salaries', 'equipment', 'marketing', 'utilities', 'other')
  ),
  description text,
  amount numeric(12, 2) not null check (amount > 0),
  spent_at date not null default current_date,
  recorded_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;

create policy "Finance roles can read expenses"
  on expenses for select
  using (is_finance());

create policy "Finance roles can write expenses"
  on expenses for insert
  with check (is_finance());

create policy "Finance roles can update expenses"
  on expenses for update
  using (is_finance());

create policy "Finance roles can delete expenses"
  on expenses for delete
  using (is_finance());

-- ── Promote a test account to accountant ─────────────────────────
--   update profiles set role = 'accountant' where email = 'someone@example.com';
