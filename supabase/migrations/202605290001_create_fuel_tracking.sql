create extension if not exists pgcrypto;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_no text not null,
  vehicle_type text not null,
  company text,
  starting_odometer numeric(12, 2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicles_vehicle_no_unique unique (vehicle_no),
  constraint vehicles_vehicle_no_not_blank check (btrim(vehicle_no) <> ''),
  constraint vehicles_vehicle_type_not_blank check (btrim(vehicle_type) <> ''),
  constraint vehicles_starting_odometer_non_negative check (starting_odometer >= 0),
  constraint vehicles_status_valid check (status in ('active', 'inactive'))
);

create table if not exists public.fuel_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,

  fuel_date date not null,
  fuel_amount numeric(12, 2) not null,
  fuel_liters numeric(12, 3) not null,

  odometer_reading numeric(12, 2) not null,
  previous_odometer_reading numeric(12, 2),
  km_driven numeric(12, 2),

  approx_mileage numeric(12, 3),
  fuel_rate numeric(12, 3),
  cost_per_km numeric(12, 3),

  bill_image_path text,
  meter_image_path text,

  remarks text,

  warning_flag boolean not null default false,
  warning_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fuel_entries_fuel_amount_positive check (fuel_amount > 0),
  constraint fuel_entries_fuel_liters_positive check (fuel_liters > 0),
  constraint fuel_entries_odometer_reading_positive check (odometer_reading > 0),
  constraint fuel_entries_previous_odometer_non_negative check (
    previous_odometer_reading is null or previous_odometer_reading >= 0
  ),
  constraint fuel_entries_km_driven_non_negative_or_warning check (
    km_driven is null or km_driven >= 0 or warning_flag = true
  )
);

create index if not exists vehicles_status_idx
  on public.vehicles (status);

create index if not exists fuel_entries_vehicle_id_idx
  on public.fuel_entries (vehicle_id);

create index if not exists fuel_entries_fuel_date_idx
  on public.fuel_entries (fuel_date desc);

create index if not exists fuel_entries_vehicle_date_idx
  on public.fuel_entries (vehicle_id, fuel_date desc, created_at desc);

create index if not exists fuel_entries_warning_flag_idx
  on public.fuel_entries (warning_flag)
  where warning_flag = true;

create or replace function public.set_fuel_tracking_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_vehicles_updated_at on public.vehicles;

create trigger set_vehicles_updated_at
before update on public.vehicles
for each row
execute function public.set_fuel_tracking_updated_at();

drop trigger if exists set_fuel_entries_updated_at on public.fuel_entries;

create trigger set_fuel_entries_updated_at
before update on public.fuel_entries
for each row
execute function public.set_fuel_tracking_updated_at();
