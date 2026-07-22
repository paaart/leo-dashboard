alter table public.vehicles
  add column if not exists national_permit_renewal_date date,
  add column if not exists insurance_renewal_date date,
  add column if not exists road_tax_renewal_date date;

create table if not exists public.vehicle_renewal_alert_dismissals (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  renewal_type text not null,
  renewal_date date not null,
  dismissed_by uuid references public.profiles(id) on delete set null,
  dismissed_at timestamptz not null default now(),

  constraint vehicle_renewal_alert_dismissals_type_valid check (
    renewal_type in ('national_permit', 'insurance', 'road_tax')
  ),
  constraint vehicle_renewal_alert_dismissals_unique unique (
    vehicle_id,
    renewal_type,
    renewal_date
  )
);

create index if not exists vehicles_national_permit_renewal_date_idx
  on public.vehicles (national_permit_renewal_date)
  where national_permit_renewal_date is not null;

create index if not exists vehicles_insurance_renewal_date_idx
  on public.vehicles (insurance_renewal_date)
  where insurance_renewal_date is not null;

create index if not exists vehicles_road_tax_renewal_date_idx
  on public.vehicles (road_tax_renewal_date)
  where road_tax_renewal_date is not null;

create index if not exists vehicle_renewal_alert_dismissals_vehicle_id_idx
  on public.vehicle_renewal_alert_dismissals (vehicle_id);

alter table public.vehicle_renewal_alert_dismissals enable row level security;
