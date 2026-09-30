-- Fixes signup breaking with "Database error creating new user": the
-- previous generate_student_code() referenced the bare `profiles` table
-- instead of `public.profiles`. That resolves fine in a session whose
-- search_path includes `public` (e.g. this CLI's connection), but GoTrue's
-- own connection role doesn't default to that, so the unqualified lookup
-- failed to resolve mid-trigger and rolled back the whole signup.
create or replace function public.generate_student_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  new_code text;
  tries int := 0;
begin
  loop
    new_code := lpad(floor(random() * 100000)::text, 5, '0');
    exit when not exists (select 1 from public.profiles where student_code = new_code);
    tries := tries + 1;
    if tries > 50 then
      raise exception 'Could not generate a unique student code after 50 attempts';
    end if;
  end loop;
  return new_code;
end;
$$;
