-- Lets staff delete a notification they sent (e.g. sent by mistake) from
-- the admin console's "Notifications sent" history. No delete policy
-- existed at all before this.
create policy "Staff can delete student notifications"
  on student_notifications for delete
  using (is_staff());
