-- Run this once in the Supabase SQL editor. It adds the `phone` field to
-- profiles and an update policy on enrollments needed for the new signup
-- flow (account creation is now separate from program enrollment).

alter table profiles add column if not exists phone text;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

drop policy if exists "Students can update their own enrollment" on enrollments;
create policy "Students can update their own enrollment"
  on enrollments for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
