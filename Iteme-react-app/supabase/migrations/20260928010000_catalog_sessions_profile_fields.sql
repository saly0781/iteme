-- Replaces the 3 placeholder programs with ITEME's real 8-course catalog,
-- widens sessions from a fixed morning/evening pair to a dynamic list
-- (morning/afternoon/evening/weekend/online), and adds the applicant fields
-- collected by ITEME's real registration form (ID/passport, residence,
-- education level, bio, prior experience) that weren't captured before.
--
-- Fresh database — no enrollments/class_sessions reference the 3 placeholder
-- programs yet, so this is a clean reseed, not a data migration.

-- ── Widen session values ────────────────────────────────────────
alter table enrollments drop constraint if exists enrollments_session_check;
alter table enrollments add constraint enrollments_session_check
  check (session in ('morning', 'afternoon', 'evening', 'weekend', 'online'));

alter table class_sessions drop constraint if exists class_sessions_session_check;
alter table class_sessions add constraint class_sessions_session_check
  check (session in ('morning', 'afternoon', 'evening', 'weekend', 'online'));

-- ── program_sessions ─────────────────────────────────────────────
-- Replaces the dedicated morning_time/morning_limit/evening_time/evening_limit
-- columns on programs with a real per-program list, so a program can offer
-- any combination of shifts instead of always exactly two.
create table if not exists program_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id text not null references programs (id) on delete cascade,
  session text not null check (session in ('morning', 'afternoon', 'evening', 'weekend', 'online')),
  time_label text,
  seat_limit int,
  unique (program_id, session)
);

alter table program_sessions enable row level security;

create policy "Anyone can read program sessions"
  on program_sessions for select
  using (true);

create policy "Admins can insert program sessions"
  on program_sessions for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update program sessions"
  on program_sessions for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete program sessions"
  on program_sessions for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

alter table programs
  drop column if exists morning_time,
  drop column if exists morning_limit,
  drop column if exists evening_time,
  drop column if exists evening_limit;

-- ── New applicant fields ─────────────────────────────────────────
alter table profiles
  add column if not exists id_passport text,
  add column if not exists residence text,
  add column if not exists education_level text,
  add column if not exists bio text;

alter table enrollments
  add column if not exists has_experience boolean;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone, id_passport, residence, education_level, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'id_passport',
    new.raw_user_meta_data ->> 'residence',
    new.raw_user_meta_data ->> 'education_level',
    new.raw_user_meta_data ->> 'bio'
  );
  return new;
end;
$$ language plpgsql security definer;

-- ── Reseed the catalog with ITEME's real 8 courses ───────────────
-- No enrollments reference the 3 placeholder ids yet, so a plain delete is
-- safe. Fee/duration/image/schedule are left for the admin to fill in from
-- the Programs page — the registration form doesn't supply that data.
-- (class_sessions is cleared first — attendance opening the admin roster
-- for the default program auto-creates a class_sessions row via upsert,
-- which would otherwise block the delete via its foreign key.)
delete from class_sessions where program_id in ('cinematography', 'photography', 'music-production');
delete from programs where id in ('cinematography', 'photography', 'music-production');

insert into programs (id, name, description, color) values
  ('audio-production', 'Audio Production and Sound Engineering', 'Recording, mixing, and mastering sound for music, film, and media.', '#2563EB'),
  ('video-production', 'Video Production and Filmmaking', 'Shooting, editing, and directing video from concept to final cut.', '#DB2777'),
  ('film-acting-directing', 'Film Acting and Directing', 'Performance technique and on-set direction for film and TV.', '#059669'),
  ('graphic-design', 'Graphic Design', 'Visual design for print, digital, and brand identity work.', '#D97706'),
  ('photography', 'Photography', 'Studio, editorial, and documentary photography fundamentals.', '#7C3AED'),
  ('dj-course', 'DJ Course', 'Mixing, beatmatching, and performance skills for live DJing.', '#DC2626'),
  ('software-development', 'Software Development', 'Building web and software applications from the ground up.', '#0891B2'),
  ('ict', 'ICT (Basic Computer Skills)', 'Practical computer literacy for everyday and workplace use.', '#4B5563')
on conflict (id) do nothing;
