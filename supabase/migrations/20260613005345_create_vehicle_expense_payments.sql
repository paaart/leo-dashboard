create table if not exists public.vehicle_expense_payments (
  id uuid primary key default gen_random_uuid(),
  payment_date date not null,
  payment_mode text,
  reference_number text,
  remarks text,
  total_amount numeric(12, 2) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.vehicle_expense_payments
  alter column payment_date set not null,
  alter column total_amount set not null;

create table if not exists public.vehicle_expense_payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.vehicle_expense_payments(id) on delete cascade,
  expense_id uuid not null references public.vehicle_expenses(id) on delete restrict,
  amount numeric(12, 2) not null,
  created_at timestamptz default now()
);

alter table public.vehicle_expense_payment_items
  alter column payment_id set not null,
  alter column expense_id set not null,
  alter column amount set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.vehicle_expense_payment_items'::regclass
      and conname = 'vehicle_expense_payment_items_expense_unique'
  ) then
    alter table public.vehicle_expense_payment_items
      add constraint vehicle_expense_payment_items_expense_unique
      unique (expense_id);
  end if;
end;
$$;

alter table public.vehicle_expenses
  add column if not exists status text default 'pending',
  add column if not exists paid_at timestamptz null,
  add column if not exists payment_id uuid null references public.vehicle_expense_payments(id);

update public.vehicle_expenses
set status = 'pending'
where status is null;

alter table public.vehicle_expenses
  alter column status set default 'pending',
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.vehicle_expenses'::regclass
      and conname = 'vehicle_expenses_status_valid'
  ) then
    alter table public.vehicle_expenses
      add constraint vehicle_expenses_status_valid
      check (status in ('pending', 'paid'));
  end if;
end;
$$;

create index if not exists vehicle_expense_payments_payment_date_idx
  on public.vehicle_expense_payments (payment_date desc);

create index if not exists vehicle_expense_payment_items_payment_id_idx
  on public.vehicle_expense_payment_items (payment_id);

create index if not exists vehicle_expense_payment_items_expense_id_idx
  on public.vehicle_expense_payment_items (expense_id);

create index if not exists vehicle_expenses_status_idx
  on public.vehicle_expenses (status);

create index if not exists vehicle_expenses_payment_id_idx
  on public.vehicle_expenses (payment_id);

drop trigger if exists set_vehicle_expense_payments_updated_at
  on public.vehicle_expense_payments;

create trigger set_vehicle_expense_payments_updated_at
before update on public.vehicle_expense_payments
for each row
execute function public.set_fuel_tracking_updated_at();
