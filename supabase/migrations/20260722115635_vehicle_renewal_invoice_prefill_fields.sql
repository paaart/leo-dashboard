alter table public.vehicles
  add column if not exists national_permit_renewal_amount numeric(12, 2),
  add column if not exists national_permit_renewal_vendor text,
  add column if not exists insurance_renewal_amount numeric(12, 2),
  add column if not exists insurance_renewal_vendor text,
  add column if not exists road_tax_renewal_amount numeric(12, 2),
  add column if not exists road_tax_renewal_vendor text;

alter table public.vehicles
  drop constraint if exists vehicles_national_permit_renewal_amount_positive,
  drop constraint if exists vehicles_insurance_renewal_amount_positive,
  drop constraint if exists vehicles_road_tax_renewal_amount_positive,
  add constraint vehicles_national_permit_renewal_amount_positive
    check (
      national_permit_renewal_amount is null
      or national_permit_renewal_amount > 0
    ),
  add constraint vehicles_insurance_renewal_amount_positive
    check (
      insurance_renewal_amount is null
      or insurance_renewal_amount > 0
    ),
  add constraint vehicles_road_tax_renewal_amount_positive
    check (
      road_tax_renewal_amount is null
      or road_tax_renewal_amount > 0
    );
