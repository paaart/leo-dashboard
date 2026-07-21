create table if not exists public.vehicle_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  expense_type text not null,
  description text,
  amount numeric(12, 2) not null,
  vendor text,
  invoice_reference text,
  city text,
  payment_mode text,
  company text,
  status text default 'paid',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint vehicle_expenses_expense_type_not_blank check (btrim(expense_type) <> ''),
  constraint vehicle_expenses_amount_positive check (amount > 0),
  constraint vehicle_expenses_status_valid check (status in ('paid', 'pending'))
);

create index if not exists vehicle_expenses_vehicle_id_idx
  on public.vehicle_expenses (vehicle_id);

create index if not exists vehicle_expenses_expense_date_idx
  on public.vehicle_expenses (expense_date desc);

drop trigger if exists set_vehicle_expenses_updated_at on public.vehicle_expenses;

create trigger set_vehicle_expenses_updated_at
before update on public.vehicle_expenses
for each row
execute function public.set_fuel_tracking_updated_at();
