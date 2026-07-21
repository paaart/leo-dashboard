create table if not exists public.vehicle_expense_invoice_item_vehicles (
  id uuid primary key default gen_random_uuid(),
  invoice_item_id uuid not null references public.vehicle_expense_invoice_items(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint vehicle_expense_invoice_item_vehicles_unique unique (invoice_item_id, vehicle_id)
);

create index if not exists vehicle_expense_invoice_item_vehicles_item_id_idx
  on public.vehicle_expense_invoice_item_vehicles (invoice_item_id);

create index if not exists vehicle_expense_invoice_item_vehicles_vehicle_id_idx
  on public.vehicle_expense_invoice_item_vehicles (vehicle_id);

insert into public.vehicle_expense_invoice_item_vehicles (
  invoice_item_id,
  vehicle_id,
  created_at
)
select
  id,
  vehicle_id,
  created_at
from public.vehicle_expense_invoice_items
where vehicle_id is not null
on conflict (invoice_item_id, vehicle_id) do nothing;
