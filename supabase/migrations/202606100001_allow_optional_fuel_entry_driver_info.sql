alter table public.fuel_entries
drop constraint if exists fuel_entries_driver_name_not_blank;

alter table public.fuel_entries
drop constraint if exists fuel_entries_driver_mobile_not_blank;

alter table public.fuel_entries
alter column driver_name drop not null,
alter column driver_name drop default,
alter column driver_mobile drop not null,
alter column driver_mobile drop default;
