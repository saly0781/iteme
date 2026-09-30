-- Lets a student remove their own enrollment, but only within 2 weeks of
-- registering — enforced here at the RLS level (not just hidden in the UI),
-- since a client-side-only restriction would be trivially bypassable via a
-- direct API call. After the window closes, only staff can remove it (see
-- "Staff can delete enrollments" in migration_staff_enroll... — unrestricted
-- by time, since staff removal isn't meant to be time-limited).
create policy "Students can remove their own recent enrollment"
  on enrollments for delete
  using (auth.uid() = student_id and enrolled_at > now() - interval '14 days');
