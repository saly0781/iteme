-- A "completed" enrollment implies a certificate of completion (per the
-- product decision: certificates are automatic from completion status, not
-- a separate manually-issued record). This needs a real timestamp for when
-- that happened, since enrolled_at is the enrollment date, not the
-- completion date, and would show a misleading "certificate issued" date.
alter table enrollments add column if not exists completed_at timestamptz;
