-- Lets signup forms (public + admin "Add student"/"Add staff") check
-- upfront whether an email/phone/ID-passport is already taken, so the user
-- sees a clear "already exists" message instead of either silently
-- succeeding with a duplicate or hitting an opaque trigger failure.
--
-- phone/id_passport had no uniqueness enforcement at all before this —
-- added as real DB constraints (defense in depth beyond the pre-check,
-- for the race-condition case of two signups at once). Multiple NULLs are
-- fine under a unique constraint, so students who skip the optional
-- id_passport field don't conflict with each other.
alter table profiles add constraint profiles_phone_key unique (phone);
alter table profiles add constraint profiles_id_passport_key unique (id_passport);

create or replace function public.check_signup_conflicts(p_email text, p_phone text, p_id_passport text)
returns text[]
language sql
security definer
set search_path = public
stable
as $$
  select array_remove(array[
    case when p_email is not null and p_email <> ''
      and exists (select 1 from profiles where email = p_email) then 'email' end,
    case when p_phone is not null and p_phone <> ''
      and exists (select 1 from profiles where phone = p_phone) then 'phone' end,
    case when p_id_passport is not null and p_id_passport <> ''
      and exists (select 1 from profiles where id_passport = p_id_passport) then 'id_passport' end
  ], null);
$$;

grant execute on function public.check_signup_conflicts(text, text, text) to anon, authenticated;
