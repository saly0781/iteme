-- Tracks whether a student's account is still on the default password the
-- admin set when creating it ("000000"), so the student dashboard can show
-- a dismissible (not forced) prompt to update it. Cleared the moment they
-- actually change their password via DashboardSettings.
alter table profiles add column if not exists is_default_password boolean not null default false;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, full_name, email, phone, id_passport, residence, education_level, bio,
    student_code, is_default_password
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'id_passport',
    new.raw_user_meta_data ->> 'residence',
    new.raw_user_meta_data ->> 'education_level',
    new.raw_user_meta_data ->> 'bio',
    public.generate_student_code(),
    coalesce((new.raw_user_meta_data ->> 'is_default_password')::boolean, false)
  );
  return new;
end;
$$ language plpgsql security definer;
