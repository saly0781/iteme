-- Adds a short, human-friendly 5-digit code every account can be looked up
-- by (admin roster search) and logged in with (alongside email/phone) from
-- the student app. Named student_code, not student_id, to avoid colliding
-- in meaning with enrollments.student_id (a foreign key to profiles.id —
-- a completely different thing).

alter table profiles add column if not exists student_code text unique;

create or replace function public.generate_student_code()
returns text
language plpgsql
as $$
declare
  new_code text;
  tries int := 0;
begin
  loop
    new_code := lpad(floor(random() * 100000)::text, 5, '0');
    exit when not exists (select 1 from profiles where student_code = new_code);
    tries := tries + 1;
    if tries > 50 then
      raise exception 'Could not generate a unique student code after 50 attempts';
    end if;
  end loop;
  return new_code;
end;
$$;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone, id_passport, residence, education_level, bio, student_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'id_passport',
    new.raw_user_meta_data ->> 'residence',
    new.raw_user_meta_data ->> 'education_level',
    new.raw_user_meta_data ->> 'bio',
    public.generate_student_code()
  );
  return new;
end;
$$ language plpgsql security definer;

update profiles set student_code = public.generate_student_code() where student_code is null;
