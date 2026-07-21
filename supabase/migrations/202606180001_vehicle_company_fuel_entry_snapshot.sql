alter table public.vehicles
add column if not exists company text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'assigned_driver'
  ) then
    update public.vehicles
    set company = assigned_driver
    where (company is null or btrim(company) = '')
      and assigned_driver is not null
      and btrim(assigned_driver) <> '';
  end if;
end $$;

alter table public.fuel_entries
add column if not exists company text;

update public.fuel_entries fe
set company = v.company
from public.vehicles v
where fe.vehicle_id = v.id
  and (fe.company is null or btrim(fe.company) = '')
  and v.company is not null
  and btrim(v.company) <> '';
