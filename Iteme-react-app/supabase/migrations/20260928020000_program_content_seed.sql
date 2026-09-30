-- Fills in the business content for all 8 programs: uniform pricing/duration/
-- level/dates, every session shift (morning/afternoon/evening/weekend/online),
-- a single "Teacher" faculty account across all programs, a 5.0 rating with a
-- varied review count per program, and per-program outcomes/skills copy.
--
-- The "Teacher" auth account (teacher@iteme.rw) was created separately via
-- the Supabase Admin API (auth.users can't be inserted from plain SQL) and
-- promoted to role='teacher' — this migration only touches programs/
-- program_sessions.

update programs set
  fee = 150000,
  duration = '3 months',
  level = 'Beginner to Advanced',
  start_date = 'October 10, 2026',
  end_date = 'December 10, 2026',
  faculty_name = 'Teacher',
  faculty_title = 'Lead Instructor',
  rating_score = 5.0,
  rating_count = case id
    when 'audio-production' then 87
    when 'video-production' then 134
    when 'film-acting-directing' then 56
    when 'graphic-design' then 112
    when 'photography' then 203
    when 'dj-course' then 78
    when 'software-development' then 165
    when 'ict' then 42
  end,
  outcomes = case id
    when 'audio-production' then $json$[
      "Record, edit, and mix multi-track audio sessions",
      "Apply signal processing (EQ, compression, reverb) to shape a mix",
      "Master tracks to a professional, release-ready standard",
      "Produce a complete original track from start to finish"
    ]$json$::jsonb
    when 'video-production' then $json$[
      "Operate professional cameras, lighting, and audio gear on set",
      "Frame and compose shots using core cinematography techniques",
      "Edit raw footage into a polished, story-driven final cut",
      "Plan and produce a short film from concept to delivery"
    ]$json$::jsonb
    when 'film-acting-directing' then $json$[
      "Build believable characters using core acting technique",
      "Perform confidently on camera across genres and scenes",
      "Direct actors and block scenes for maximum impact",
      "Break down a script and translate it into a directed shoot"
    ]$json$::jsonb
    when 'graphic-design' then $json$[
      "Design layouts and visuals for print and digital media",
      "Build a cohesive brand identity system from scratch",
      "Apply typography, color, and composition principles confidently",
      "Deliver client-ready design files across formats"
    ]$json$::jsonb
    when 'photography' then $json$[
      "Shoot confidently in studio, editorial, and outdoor settings",
      "Control exposure, lighting, and composition manually",
      "Retouch and prepare images for print and digital delivery",
      "Build a professional portfolio across multiple genres"
    ]$json$::jsonb
    when 'dj-course' then $json$[
      "Beatmatch and mix tracks seamlessly across genres",
      "Read a crowd and build an energy-driven set",
      "Use effects, looping, and transitions like a professional DJ",
      "Perform a full live set from warm-up to peak time"
    ]$json$::jsonb
    when 'software-development' then $json$[
      "Build and deploy full web applications from scratch",
      "Write clean, maintainable code using modern best practices",
      "Work with databases and APIs to power real applications",
      "Collaborate on projects using version control and Git"
    ]$json$::jsonb
    when 'ict' then $json$[
      "Confidently use a computer for everyday and work tasks",
      "Create and manage documents, spreadsheets, and presentations",
      "Navigate the internet, email, and basic online safety practices",
      "Apply core digital skills required in most modern workplaces"
    ]$json$::jsonb
  end,
  skills = case id
    when 'audio-production' then $json$[
      "Audio Engineering", "Mixing", "Mastering", "Sound Design",
      "Pro Tools", "Ableton Live", "Microphone Techniques", "Vocal Recording"
    ]$json$::jsonb
    when 'video-production' then $json$[
      "Camera Operation", "Lighting Design", "Shot Composition", "Video Editing",
      "Premiere Pro", "DaVinci Resolve", "Storyboarding", "Color Grading"
    ]$json$::jsonb
    when 'film-acting-directing' then $json$[
      "Scene Study", "Character Development", "On-Camera Technique", "Script Analysis",
      "Directing Actors", "Blocking", "Voice & Movement", "Set Etiquette"
    ]$json$::jsonb
    when 'graphic-design' then $json$[
      "Adobe Photoshop", "Adobe Illustrator", "Typography", "Branding",
      "Layout Design", "Color Theory", "Logo Design", "Print & Digital Design"
    ]$json$::jsonb
    when 'photography' then $json$[
      "Studio Lighting", "Portraiture", "Photo Retouching", "Composition",
      "Lightroom", "Photoshop", "Camera Settings", "Editorial Styling"
    ]$json$::jsonb
    when 'dj-course' then $json$[
      "Beatmatching", "Track Selection", "Mixing", "Live Performance",
      "DJ Controllers", "Music Theory Basics", "Crowd Reading", "Set Building"
    ]$json$::jsonb
    when 'software-development' then $json$[
      "HTML/CSS", "JavaScript", "React", "Git & GitHub",
      "Databases", "REST APIs", "Problem Solving", "Debugging"
    ]$json$::jsonb
    when 'ict' then $json$[
      "Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint", "Email & Internet Basics",
      "File Management", "Typing Skills", "Online Safety", "Basic Troubleshooting"
    ]$json$::jsonb
  end
where id in (
  'audio-production', 'video-production', 'film-acting-directing', 'graphic-design',
  'photography', 'dj-course', 'software-development', 'ict'
);

-- ── Full schedule for every program: morning/afternoon/evening/weekend/online ──
delete from program_sessions where program_id in (
  'audio-production', 'video-production', 'film-acting-directing', 'graphic-design',
  'photography', 'dj-course', 'software-development', 'ict'
);

insert into program_sessions (program_id, session, time_label, seat_limit)
select p.id, s.session, s.time_label, 20
from programs p
cross join (
  values
    ('morning', '8:00 AM – 12:00 PM'),
    ('afternoon', '1:00 PM – 4:00 PM'),
    ('evening', '5:00 PM – 9:00 PM'),
    ('weekend', 'Saturday, 9:00 AM – 1:00 PM'),
    ('online', 'Live-online, flexible hours')
) as s(session, time_label)
where p.id in (
  'audio-production', 'video-production', 'film-acting-directing', 'graphic-design',
  'photography', 'dj-course', 'software-development', 'ict'
);
