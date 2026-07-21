alter table public.fuel_entries
add column if not exists driver_name text not null default '';

alter table public.fuel_entries
add column if not exists driver_mobile text not null default '';

alter table public.fuel_entries
alter column driver_name set default '';

alter table public.fuel_entries
alter column driver_mobile set default '';

update public.fuel_entries
set
  driver_name = coalesce(
    nullif(trim(substring(coalesce(remarks, '') from 'Driver Name: ([^\n\r]+)')), ''),
    nullif(trim(driver_name), ''),
    'Legacy Entry'
  ),
  driver_mobile = coalesce(
    nullif(trim(substring(coalesce(remarks, '') from 'Driver Mobile: ([^\n\r]+)')), ''),
    nullif(trim(driver_mobile), ''),
    '0000000000'
  )
where btrim(driver_name) = ''
   or btrim(driver_mobile) = '';

update public.fuel_entries
set
  driver_name = coalesce(nullif(btrim(driver_name), ''), 'Legacy Entry'),
  driver_mobile = coalesce(nullif(btrim(driver_mobile), ''), '0000000000')
where driver_name is null
   or driver_mobile is null
   or btrim(driver_name) = ''
   or btrim(driver_mobile) = '';

alter table public.fuel_entries
alter column driver_name set not null;

alter table public.fuel_entries
alter column driver_mobile set not null;

do $$
begin
  alter table public.fuel_entries
  drop constraint if exists fuel_entries_driver_name_not_blank;

  alter table public.fuel_entries
  drop constraint if exists fuel_entries_driver_mobile_not_blank;

  alter table public.fuel_entries
  add constraint fuel_entries_driver_name_not_blank
  check (btrim(driver_name) <> '');

  alter table public.fuel_entries
  add constraint fuel_entries_driver_mobile_not_blank
  check (btrim(driver_mobile) <> '');
end $$;
