alter table public.vehicles
  add column if not exists national_permit_last_renewal_date date,
  add column if not exists national_permit_next_renewal_date date,
  add column if not exists insurance_last_renewal_date date,
  add column if not exists insurance_next_renewal_date date,
  add column if not exists road_tax_last_renewal_date date,
  add column if not exists road_tax_next_renewal_date date;

update public.vehicles
set
  national_permit_last_renewal_date = coalesce(
    national_permit_last_renewal_date,
    national_permit_renewal_date
  ),
  national_permit_next_renewal_date = coalesce(
    national_permit_next_renewal_date,
    national_permit_renewal_date + 365
  ),
  insurance_last_renewal_date = coalesce(
    insurance_last_renewal_date,
    insurance_renewal_date
  ),
  insurance_next_renewal_date = coalesce(
    insurance_next_renewal_date,
    insurance_renewal_date + 365
  ),
  road_tax_last_renewal_date = coalesce(
    road_tax_last_renewal_date,
    road_tax_renewal_date
  ),
  road_tax_next_renewal_date = coalesce(
    road_tax_next_renewal_date,
    road_tax_renewal_date + 365
  )
where
  national_permit_renewal_date is not null
  or insurance_renewal_date is not null
  or road_tax_renewal_date is not null;

drop index if exists vehicles_national_permit_renewal_date_idx;
drop index if exists vehicles_insurance_renewal_date_idx;
drop index if exists vehicles_road_tax_renewal_date_idx;

create index if not exists vehicles_national_permit_next_renewal_date_idx
  on public.vehicles (national_permit_next_renewal_date)
  where national_permit_next_renewal_date is not null;

create index if not exists vehicles_insurance_next_renewal_date_idx
  on public.vehicles (insurance_next_renewal_date)
  where insurance_next_renewal_date is not null;

create index if not exists vehicles_road_tax_next_renewal_date_idx
  on public.vehicles (road_tax_next_renewal_date)
  where road_tax_next_renewal_date is not null;

alter table public.vehicle_expense_invoice_items
  add column if not exists renewal_type text;

alter table public.vehicle_expense_invoice_items
  drop constraint if exists vehicle_expense_invoice_items_renewal_type_valid,
  add constraint vehicle_expense_invoice_items_renewal_type_valid check (
    renewal_type is null
    or renewal_type in ('national_permit', 'insurance', 'road_tax')
  );

