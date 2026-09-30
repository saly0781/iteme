-- ============================================================
-- Iteme Hub — consolidated schema rebuild for a fresh Supabase project
-- Generated 2026-09-28 from schema.sql + all migrations, in dependency order.
-- Run this ONCE in the new project's SQL Editor (Project -> SQL Editor -> New query).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- Source: schema.sql
-- ────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────
-- Source: migration_admin_access.sql
-- ────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────
-- Source: migration_finance.sql
-- ────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────
-- Source: migration_fixed_expenses.sql
-- ────────────────────────────────────────────────────────────
-- Run after migration_finance.sql (needs is_finance()). Adds recurring
-- obligations — a teacher's monthly salary, the studio's rent, etc. — so
-- the CEO can see what's expected each month, not just what's already been
-- logged as an ad-hoc expense.

create table if not exists fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text not null check (
    category in ('rent', 'salaries', 'equipment', 'marketing', 'utilities', 'other')
  ),
  amount numeric(12, 2) not null check (amount > 0),
  -- Set when this obligation is a specific staff member's salary; null for
  -- things like rent that aren't tied to a person.
  profile_id uuid references profiles (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table fixed_expenses enable row level security;

create policy "Finance roles can read fixed expenses"
  on fixed_expenses for select
  using (is_finance());

create policy "Finance roles can write fixed expenses"
  on fixed_expenses for insert
  with check (is_finance());

create policy "Finance roles can update fixed expenses"
  on fixed_expenses for update
  using (is_finance());

create policy "Finance roles can delete fixed expenses"
  on fixed_expenses for delete
  using (is_finance());

-- Lets an actual expense payment be linked back to the obligation it pays
-- down (e.g. "this expense record is October's rent"), so paid-vs-owed can
-- be computed precisely instead of guessed from category + date alone.
alter table expenses
  add column if not exists fixed_expense_id uuid references fixed_expenses (id) on delete set null;


-- ────────────────────────────────────────────────────────────
-- Source: migration_program_seat_counts.sql
-- ────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────
-- Source: migration_add_phone.sql
-- ────────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL editor. It adds the `phone` field to
-- profiles and an update policy on enrollments needed for the new signup
-- flow (account creation is now separate from program enrollment).

alter table profiles add column if not exists phone text;

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

drop policy if exists "Students can update their own enrollment" on enrollments;
create policy "Students can update their own enrollment"
  on enrollments for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);


-- ────────────────────────────────────────────────────────────
-- Source: migration_application_fee.sql
-- ────────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL editor. Adds application-fee payment
-- tracking, an approval status students can see on their dashboard, and
-- persists the enrollment-type/scholarship fields the form already collects.

alter table enrollments
  add column if not exists approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected'));

alter table enrollments
  add column if not exists application_fee_paid boolean not null default false;

alter table enrollments
  add column if not exists payment_method text
    check (payment_method in ('mobile_money', 'card'));

alter table enrollments
  add column if not exists enrollment_type text
    check (enrollment_type in ('full', 'scholarship'));

alter table enrollments
  add column if not exists household_income text;

alter table enrollments
  add column if not exists scholarship_reason text;


-- ────────────────────────────────────────────────────────────
-- Source: migration_enrollment_color.sql
-- ────────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL editor. Lets a student override the
-- program's default calendar/schedule color with their own pick. Program
-- default colors live in src/data/programs.js (program.color) — this column
-- only stores the student's personal override, and is null until they set one.

alter table enrollments
  add column if not exists color text;


-- ────────────────────────────────────────────────────────────
-- Source: migration_programs.sql
-- ────────────────────────────────────────────────────────────
-- Run after migration_finance.sql / migration_fixed_expenses.sql. Moves
-- program content (fee, schedule, faculty, marketing copy, images) out of
-- the static data/programs.js files in both apps and into the database, so
-- an admin can add/edit a program from the Iteme-admin dashboard instead of
-- editing code and redeploying two apps.

-- ── Columns ──────────────────────────────────────────────────────
alter table programs
  add column if not exists color text,
  add column if not exists image_url text,
  add column if not exists description text,
  add column if not exists fee numeric(12, 2),
  add column if not exists duration text,
  add column if not exists level text,
  add column if not exists format text,
  add column if not exists is_open boolean not null default true,
  add column if not exists start_date text,
  add column if not exists end_date text,
  add column if not exists next_intake_date text,
  add column if not exists morning_time text,
  add column if not exists morning_limit int,
  add column if not exists evening_time text,
  add column if not exists evening_limit int,
  add column if not exists faculty_name text,
  add column if not exists faculty_title text,
  add column if not exists outcomes jsonb not null default '[]'::jsonb,
  add column if not exists skills jsonb not null default '[]'::jsonb,
  add column if not exists modules jsonb not null default '[]'::jsonb,
  add column if not exists testimonials jsonb not null default '[]'::jsonb,
  add column if not exists rating_score numeric(2, 1),
  add column if not exists rating_count int,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

-- ── Write access: admin (CEO) only ───────────────────────────────
-- The existing "Anyone signed in can read programs" select policy from
-- schema.sql is untouched — everyone still reads the catalog.
create policy "Admins can insert programs"
  on programs for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update programs"
  on programs for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete programs"
  on programs for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ── Storage bucket for program cover photos ──────────────────────
insert into storage.buckets (id, name, public)
values ('program-images', 'program-images', true)
on conflict (id) do nothing;

create policy "Public can view program images"
  on storage.objects for select
  using (bucket_id = 'program-images');

create policy "Admins can upload program images"
  on storage.objects for insert
  with check (
    bucket_id = 'program-images'
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update program images"
  on storage.objects for update
  using (
    bucket_id = 'program-images'
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete program images"
  on storage.objects for delete
  using (
    bucket_id = 'program-images'
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ── Backfill the three existing programs with their full content ────
-- image_url is left null — the apps fall back to their bundled local JPGs
-- for these three until someone uploads a real photo from the Programs
-- page. New programs created from now on require an upload.

update programs set
  color = '#2563EB',
  description = 'Master lighting, composition, and narrative storytelling for film and digital media.',
  fee = 850000,
  duration = '10 months',
  level = 'Beginner to Advanced',
  format = 'In-studio · Kigali Campus',
  is_open = true,
  start_date = 'September 1, 2026',
  end_date = 'June 30, 2027',
  next_intake_date = 'January 15, 2027',
  morning_time = '8:00 AM – 12:00 PM', morning_limit = 20,
  evening_time = '4:00 PM – 8:00 PM', evening_limit = 20,
  faculty_name = 'Jean-Paul Habimana',
  faculty_title = 'Lead Cinematography Instructor · 12 years in film',
  rating_score = 4.9, rating_count = 142,
  outcomes = $json$[
    "Frame and light scenes using professional cinematography techniques",
    "Operate industry-standard cameras, gimbals, and lighting rigs",
    "Edit and color-grade footage into a polished short film",
    "Build a director-ready portfolio reel"
  ]$json$::jsonb,
  skills = $json$[
    "Camera Operation", "Lighting Design", "Shot Composition", "Color Grading",
    "Gimbal Stabilization", "Story Structure", "Premiere Pro", "DaVinci Resolve"
  ]$json$::jsonb,
  modules = $json$[
    {"title": "Foundations of the Frame", "duration": "3 weeks", "description": "Composition, exposure, and camera fundamentals."},
    {"title": "Lighting for Story", "duration": "3 weeks", "description": "Three-point lighting, natural light, and mood."},
    {"title": "Movement & Gear", "duration": "3 weeks", "description": "Gimbals, dollies, and dynamic camera work."},
    {"title": "The Final Cut", "duration": "3 weeks", "description": "Editing, color grading, and portfolio reel production."}
  ]$json$::jsonb,
  testimonials = $json$[
    {"quote": "The lighting module completely changed how I see a scene before I even roll camera.", "name": "Aline U.", "cohort": "Cinematography, 2025"},
    {"quote": "I walked in barely knowing my camera settings and walked out with a reel I'm proud to show clients.", "name": "Eric N.", "cohort": "Cinematography, 2024"}
  ]$json$::jsonb
where id = 'cinematography';

update programs set
  color = '#DB2777',
  description = 'From commercial studio techniques to compelling editorial and documentary storytelling.',
  fee = 750000,
  duration = '10 months',
  level = 'Beginner to Advanced',
  format = 'In-studio · Kigali Campus',
  is_open = false,
  start_date = 'September 1, 2026',
  end_date = 'June 30, 2027',
  next_intake_date = 'January 15, 2027',
  morning_time = '8:00 AM – 12:00 PM', morning_limit = 18,
  evening_time = '4:00 PM – 8:00 PM', evening_limit = 17,
  faculty_name = 'Diane Uwase',
  faculty_title = 'Lead Photography Instructor · 9 years shooting editorial',
  rating_score = 4.7, rating_count = 98,
  outcomes = $json$[
    "Shoot confidently in studio, editorial, and documentary settings",
    "Direct subjects and build a cohesive visual story",
    "Retouch and prepare images for print and digital delivery",
    "Package and pitch a professional portfolio"
  ]$json$::jsonb,
  skills = $json$[
    "Studio Lighting", "Portraiture", "Editorial Styling", "Photo Retouching",
    "Lightroom", "Photoshop", "Client Direction", "Documentary Photography"
  ]$json$::jsonb,
  modules = $json$[
    {"title": "Camera & Light Fundamentals", "duration": "3 weeks", "description": "Exposure, metering, and working with natural and studio light."},
    {"title": "Studio & Portrait Work", "duration": "3 weeks", "description": "Directing subjects and lighting for portraiture."},
    {"title": "Editorial & Documentary Storytelling", "duration": "3 weeks", "description": "Building a visual narrative across a shoot."},
    {"title": "Retouching & Portfolio Delivery", "duration": "3 weeks", "description": "Post-production workflow and packaging a client-ready portfolio."}
  ]$json$::jsonb,
  testimonials = $json$[
    {"quote": "Diane's studio lighting breakdowns are the reason I book my own clients now.", "name": "Sandrine M.", "cohort": "Photography, 2025"},
    {"quote": "This program is the closest thing to a real studio job you'll find before graduating.", "name": "Patrick K.", "cohort": "Photography, 2024"}
  ]$json$::jsonb
where id = 'photography';

update programs set
  color = '#059669',
  description = 'Expert instruction in audio engineering, mixing, synthesis, and mastering.',
  fee = 950000,
  duration = '10 months',
  level = 'Beginner to Advanced',
  format = 'In-studio · Kigali Campus',
  is_open = true,
  start_date = 'September 1, 2026',
  end_date = 'June 30, 2027',
  next_intake_date = 'January 15, 2027',
  morning_time = '9:00 AM – 1:00 PM', morning_limit = 15,
  evening_time = '5:00 PM – 9:00 PM', evening_limit = 15,
  faculty_name = 'Samuel Iradukunda',
  faculty_title = 'Lead Audio Instructor · 10 years mixing & mastering',
  rating_score = 4.8, rating_count = 87,
  outcomes = $json$[
    "Record, edit, and mix multi-track sessions",
    "Design and layer sound using synthesis and sampling",
    "Master tracks to a professional, release-ready standard",
    "Produce a complete EP from concept to final master"
  ]$json$::jsonb,
  skills = $json$[
    "Audio Engineering", "Mixing", "Mastering", "Sound Design",
    "Ableton Live", "Logic Pro", "Synthesis", "Vocal Recording"
  ]$json$::jsonb,
  modules = $json$[
    {"title": "Studio Signal Flow", "duration": "3 weeks", "description": "Studio setup, signal chains, and session prep."},
    {"title": "Recording & Editing", "duration": "3 weeks", "description": "Tracking vocals and instruments, comping and editing takes."},
    {"title": "Mixing & Sound Design", "duration": "3 weeks", "description": "Balancing a mix and building sounds from scratch."},
    {"title": "Mastering & EP Release", "duration": "3 weeks", "description": "Final mastering pass and preparing a release-ready EP."}
  ]$json$::jsonb,
  testimonials = $json$[
    {"quote": "I released my first EP before I even finished the program.", "name": "Grace N.", "cohort": "Music Production, 2025"},
    {"quote": "Samuel breaks mixing down in a way that finally made it click for me.", "name": "Yves H.", "cohort": "Music Production, 2024"}
  ]$json$::jsonb
where id = 'music-production';


-- ────────────────────────────────────────────────────────────
-- Source: migration_public_programs_read.sql
-- ────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────
-- Source: migration_student_blocking.sql
-- ────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────
-- Source: migration_staff_title.sql
-- ────────────────────────────────────────────────────────────
-- Run after migration_programs.sql. Lets a teacher's profile carry a title
-- (e.g. "Lead Cinematography Instructor · 12 years in film") so the
-- Programs page can pick faculty from real staff accounts instead of
-- free-typing a name and title by hand.

alter table profiles add column if not exists title text;

