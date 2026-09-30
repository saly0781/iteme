-- Lets a teacher or admin remove a student's enrollment in a program (e.g.
-- they were added to the wrong one) from the admin console. Mirrors the
-- role scope of the existing "Staff can insert enrollments" policy — no
-- delete policy existed at all before this, so this was previously
-- impossible from the client.
create policy "Staff can delete enrollments"
  on enrollments for delete
  using (is_staff());
