alter table public.profiles
add column if not exists username text;

update public.profiles
set username = split_part(email, '@', 1)
where username is null or btrim(username) = '';

alter table public.profiles
alter column username set not null;

create unique index if not exists profiles_username_unique_idx
on public.profiles (lower(username));

alter table public.profiles
drop constraint if exists profiles_username_not_blank;

alter table public.profiles
add constraint profiles_username_not_blank
check (btrim(username) <> '');

alter table public.profiles
drop constraint if exists profiles_username_format;

alter table public.profiles
add constraint profiles_username_format
check (username ~ '^[A-Za-z0-9_-]+$');
