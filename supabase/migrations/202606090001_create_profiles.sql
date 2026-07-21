create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'user',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_email_not_blank check (btrim(email) <> ''),
  constraint profiles_role_valid check (role in ('user', 'admin')),
  constraint profiles_status_valid check (status in ('active', 'inactive'))
);

create index if not exists profiles_auth_user_id_idx
  on public.profiles (auth_user_id);

create index if not exists profiles_role_idx
  on public.profiles (role);

create index if not exists profiles_status_idx
  on public.profiles (status);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();
