-- Every account needs an invite, including the first admin. The old "first
-- sign-in becomes admin" rule was a race once the site is public: whoever
-- found the link first would own the university.
--
-- Bootstrap the first admin once, from the SQL editor:
--   insert into public.invites (email, full_name, role) values ('you@example.com', 'Pooja', 'admin');
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv public.invites%rowtype;
begin
  select * into inv from public.invites where email = lower(new.email);
  if inv.email is null then
    raise exception 'This email has not been invited to Wrap It Up University.'
      using errcode = 'P0001';
  end if;

  insert into public.users (id, email, full_name, avatar_url, role, department)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(inv.full_name, ''), new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    inv.role,
    inv.department
  );
  update public.invites set accepted_at = now() where email = inv.email;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
