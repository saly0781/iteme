# Iteme Hub — Staff Console

The teacher/admin dashboard for Iteme Hub. A separate app from the student site
(`Iteme-react-app`) so it can be deployed and pointed at its own subdomain
(e.g. `staff.itemehub.com`), but it talks to the **same Supabase project** —
same database, same auth users, just gated to `teacher`/`admin` accounts
instead of `student`.

## Setup

```bash
npm install
```

`.env` is already filled in with the same Supabase project the student app
uses. If you ever point this at a different project, copy `.env.example` to
`.env` and fill in your own `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

**Before first use**, run `../Iteme-react-app/supabase/migration_admin_access.sql`
in the Supabase SQL editor — it grants teacher/admin accounts read/write
access to other students' profiles and enrollments, and write access to the
class schedule. Without it, this console can log in but every list will come
back empty (RLS silently blocks the reads).

There's no staff signup form on purpose. To create a staff account: sign up
as a normal student on the student site (or via the Supabase dashboard),
then run:

```sql
update profiles set role = 'admin' where email = 'someone@example.com';
-- or role = 'teacher'
```

## Run

```bash
npm run dev
```

## Pages

- **Dashboard** — pending-application count, active-student count, today's
  classes at a glance.
- **Applications** — approve/reject pending applications; move an approved
  student to Completed/Withdrawn.
- **Attendance** — pick a program/session/date, mark each enrolled student
  Present/Late/Absent. Creates the `class_sessions` row for that date if it
  doesn't exist yet.
- **Schedule** — add/remove the class dates that show up on students'
  dashboard calendars (this is the "teacher adds the schedule" feature the
  student app's calendar/color-coding was built around).
- **Students** — roster of every student account and the programs they're
  enrolled in.
- **Settings** — the signed-in staff member's own name/phone/password.

## Notes

- `src/data/programs.js` is a trimmed copy of the student app's file (just
  what these pages need: id, name, color, image, fee, duration, schedule,
  faculty). Program copy like descriptions/outcomes/testimonials lives only
  in the student app. If you add a new program, update both files — there's
  no shared package between the two apps.
- No payment/certificate-issuing flows here — this only covers what was
  missing for staff to actually run the program: approvals, attendance, and
  the class schedule.
