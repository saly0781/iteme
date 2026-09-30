-- Lets a teacher or admin enroll a student into a program directly from the
-- admin console (for walk-in students, instead of requiring the student to
-- self-apply through the student app first). Mirrors the role scope of the
-- existing "Teachers and admins can update all enrollments" policy.
create policy "Staff can insert enrollments"
  on enrollments for insert
  with check (is_staff());
