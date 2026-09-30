-- Snapshots the program's fee onto the enrollment at the moment it's
-- created, so a later price change on the program never retroactively
-- changes what an already-enrolled student appears to owe. All
-- "expected/owing" math should read enrollments.fee from now on, not
-- programs.fee through the join.
--
-- A trigger (not just remembering to pass fee from every insert call site —
-- student self-apply in ApplySheet.jsx, admin's "Add program" in
-- Students.jsx, and any future one) is the only way this holds regardless
-- of which code path creates the row.
alter table enrollments add column if not exists fee numeric(12, 2);

create or replace function public.snapshot_enrollment_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.fee is null then
    select fee into new.fee from programs where id = new.program_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_enrollment_fee on enrollments;
create trigger set_enrollment_fee
  before insert on enrollments
  for each row execute procedure public.snapshot_enrollment_fee();

-- Backfill existing rows with their program's current fee — the best
-- available approximation, since no snapshot existed before this migration.
update enrollments e set fee = p.fee
from programs p
where p.id = e.program_id and e.fee is null;
