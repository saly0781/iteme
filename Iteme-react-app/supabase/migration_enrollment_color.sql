-- Run this once in the Supabase SQL editor. Lets a student override the
-- program's default calendar/schedule color with their own pick. Program
-- default colors live in src/data/programs.js (program.color) — this column
-- only stores the student's personal override, and is null until they set one.

alter table enrollments
  add column if not exists color text;
