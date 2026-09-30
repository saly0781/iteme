-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

-- ── Profiles ─────────────────────────────────────────────────────
-- Extends auth.users with app-facing fields (name, role).
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Programs ─────────────────────────────────────────────────────
-- Mirrors the ids in src/data/programs.js (id, name only — everything
-- else about a program stays in the frontend data file).
create table if not exists programs (
  id text primary key,
  name text not null
);

alter table programs enable row level security;

create policy "Anyone signed in can read programs"
  on programs for select
  using (auth.role() = 'authenticated');

insert into programs (id, name) values
  ('cinematography', 'Cinematography'),
  ('photography', 'Professional Photography'),
  ('music-production', 'Music Production')
on conflict (id) do nothing;

-- ── Enrollments ──────────────────────────────────────────────────
-- Which program + session (morning/evening) a student is enrolled in.
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  program_id text not null references programs (id),
  session text not null check (session in ('morning', 'evening')),
  status text not null default 'active' check (status in ('active', 'completed', 'withdrawn')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  application_fee_paid boolean not null default false,
  payment_method text check (payment_method in ('mobile_money', 'card')),
  enrollment_type text check (enrollment_type in ('full', 'scholarship')),
  household_income text,
  scholarship_reason text,
  enrolled_at timestamptz not null default now(),
  unique (student_id, program_id)
);

alter table enrollments enable row level security;

create policy "Students can read their own enrollments"
  on enrollments for select
  using (auth.uid() = student_id);

create policy "Students can create their own enrollment"
  on enrollments for insert
  with check (auth.uid() = student_id);

create policy "Students can update their own enrollment"
  on enrollments for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ── Class sessions ───────────────────────────────────────────────
-- One row per actual class date (e.g. "Cinematography, morning, 2026-09-08").
-- Empty until a teacher dashboard (or manual seed) creates rows.
create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id text not null references programs (id),
  session text not null check (session in ('morning', 'evening')),
  session_date date not null,
  topic text,
  unique (program_id, session, session_date)
);

alter table class_sessions enable row level security;

create policy "Anyone signed in can read class sessions"
  on class_sessions for select
  using (auth.role() = 'authenticated');

-- ── Attendance ───────────────────────────────────────────────────
-- One row per student per class session. Only a teacher/admin should
-- ever write to this table — students only ever read their own rows.
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references class_sessions (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'unmarked' check (status in ('present', 'absent', 'late', 'unmarked')),
  marked_by uuid references profiles (id),
  marked_at timestamptz,
  unique (class_session_id, student_id)
);

alter table attendance enable row level security;

create policy "Students can read their own attendance"
  on attendance for select
  using (auth.uid() = student_id);

create policy "Teachers and admins can read all attendance"
  on attendance for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('teacher', 'admin')
    )
  );

create policy "Teachers and admins can write attendance"
  on attendance for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('teacher', 'admin')
    )
  );
