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
