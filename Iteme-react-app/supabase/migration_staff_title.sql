-- Run after migration_programs.sql. Lets a teacher's profile carry a title
-- (e.g. "Lead Cinematography Instructor · 12 years in film") so the
-- Programs page can pick faculty from real staff accounts instead of
-- free-typing a name and title by hand.

alter table profiles add column if not exists title text;
