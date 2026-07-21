alter table public.profiles
add column if not exists phone text;

update public.profiles
set username = lower(username)
where username is not null
  and username <> lower(username);

alter table public.profiles
drop constraint if exists profiles_status_valid;

alter table public.profiles
add constraint profiles_status_valid
check (status in ('pending', 'active', 'inactive', 'rejected'));

create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);
