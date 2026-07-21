create table if not exists public.vehicle_expense_invoices (
  id uuid primary key default gen_random_uuid(),
  vendor_name text not null,
  invoice_number text,
  invoice_date date not null,
  due_date date,
  total_amount numeric(12, 2) not null,
  status text not null default 'unpaid',
  remarks text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicle_expense_invoices_vendor_name_not_blank check (btrim(vendor_name) <> ''),
  constraint vehicle_expense_invoices_total_amount_positive check (total_amount > 0),
  constraint vehicle_expense_invoices_status_valid check (status in ('unpaid', 'partially_paid', 'paid'))
);

create table if not exists public.vehicle_expense_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.vehicle_expense_invoices(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete restrict,
  expense_type text not null,
  description text,
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),

  constraint vehicle_expense_invoice_items_expense_type_not_blank check (btrim(expense_type) <> ''),
  constraint vehicle_expense_invoice_items_amount_positive check (amount > 0)
);

create table if not exists public.vehicle_expense_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.vehicle_expense_invoices(id) on delete cascade,
  payment_date date not null,
  amount numeric(12, 2) not null,
  payment_mode text,
  reference_number text,
  remarks text,
  created_by uuid,
  created_at timestamptz not null default now(),

  constraint vehicle_expense_invoice_payments_amount_positive check (amount > 0)
);

create index if not exists vehicle_expense_invoices_status_idx
  on public.vehicle_expense_invoices (status);

create index if not exists vehicle_expense_invoices_invoice_date_idx
  on public.vehicle_expense_invoices (invoice_date desc);

create index if not exists vehicle_expense_invoices_due_date_idx
  on public.vehicle_expense_invoices (due_date);

create index if not exists vehicle_expense_invoices_vendor_name_idx
  on public.vehicle_expense_invoices (vendor_name);

create index if not exists vehicle_expense_invoice_items_invoice_id_idx
  on public.vehicle_expense_invoice_items (invoice_id);

create index if not exists vehicle_expense_invoice_items_vehicle_id_idx
  on public.vehicle_expense_invoice_items (vehicle_id);

create index if not exists vehicle_expense_invoice_payments_invoice_id_idx
  on public.vehicle_expense_invoice_payments (invoice_id);

drop trigger if exists set_vehicle_expense_invoices_updated_at
  on public.vehicle_expense_invoices;

create trigger set_vehicle_expense_invoices_updated_at
before update on public.vehicle_expense_invoices
for each row
execute function public.set_fuel_tracking_updated_at();

create or replace function public.vehicle_expense_invoice_item_total(invoice_uuid uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(amount), 0)
  from public.vehicle_expense_invoice_items
  where invoice_id = invoice_uuid;
$$;

create or replace function public.vehicle_expense_invoice_paid_total(invoice_uuid uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(amount), 0)
  from public.vehicle_expense_invoice_payments
  where invoice_id = invoice_uuid;
$$;

create or replace function public.sync_vehicle_expense_invoice_status(invoice_uuid uuid)
returns void
language plpgsql
as $$
declare
  invoice_total numeric;
  paid_total numeric;
  next_status text;
begin
  select total_amount
    into invoice_total
  from public.vehicle_expense_invoices
  where id = invoice_uuid;

  if invoice_total is null then
    return;
  end if;

  paid_total := public.vehicle_expense_invoice_paid_total(invoice_uuid);

  if paid_total = 0 then
    next_status := 'unpaid';
  elsif paid_total < invoice_total then
    next_status := 'partially_paid';
  else
    next_status := 'paid';
  end if;

  update public.vehicle_expense_invoices
  set status = next_status
  where id = invoice_uuid;
end;
$$;

create or replace function public.validate_vehicle_expense_invoice_item_total()
returns trigger
language plpgsql
as $$
declare
  invoice_uuid uuid;
  invoice_total numeric;
  item_total numeric;
begin
  invoice_uuid := coalesce(new.invoice_id, old.invoice_id);

  select total_amount
    into invoice_total
  from public.vehicle_expense_invoices
  where id = invoice_uuid;

  if invoice_total is null then
    return null;
  end if;

  item_total := public.vehicle_expense_invoice_item_total(invoice_uuid);

  if item_total <> invoice_total then
    raise exception 'Invoice total_amount must equal sum of invoice item amounts';
  end if;

  return null;
end;
$$;

create or replace function public.validate_vehicle_expense_invoice_total()
returns trigger
language plpgsql
as $$
declare
  item_total numeric;
begin
  item_total := public.vehicle_expense_invoice_item_total(new.id);

  if item_total <> new.total_amount then
    raise exception 'Invoice total_amount must equal sum of invoice item amounts';
  end if;

  return null;
end;
$$;

create or replace function public.validate_vehicle_expense_invoice_payment_total()
returns trigger
language plpgsql
as $$
declare
  invoice_uuid uuid;
  invoice_total numeric;
  paid_total numeric;
begin
  invoice_uuid := coalesce(new.invoice_id, old.invoice_id);

  select total_amount
    into invoice_total
  from public.vehicle_expense_invoices
  where id = invoice_uuid;

  if invoice_total is null then
    return null;
  end if;

  paid_total := public.vehicle_expense_invoice_paid_total(invoice_uuid);

  if paid_total > invoice_total then
    raise exception 'Total paid amount cannot exceed invoice total_amount';
  end if;

  perform public.sync_vehicle_expense_invoice_status(invoice_uuid);

  return null;
end;
$$;

create or replace function public.validate_vehicle_expense_invoice_payment_total_for_invoice()
returns trigger
language plpgsql
as $$
declare
  paid_total numeric;
begin
  paid_total := public.vehicle_expense_invoice_paid_total(new.id);

  if paid_total > new.total_amount then
    raise exception 'Total paid amount cannot exceed invoice total_amount';
  end if;

  perform public.sync_vehicle_expense_invoice_status(new.id);

  return null;
end;
$$;

drop trigger if exists validate_vehicle_expense_invoice_item_total_after_items
  on public.vehicle_expense_invoice_items;

create constraint trigger validate_vehicle_expense_invoice_item_total_after_items
after insert or update or delete on public.vehicle_expense_invoice_items
deferrable initially deferred
for each row
execute function public.validate_vehicle_expense_invoice_item_total();

drop trigger if exists validate_vehicle_expense_invoice_item_total_after_invoice
  on public.vehicle_expense_invoices;

create constraint trigger validate_vehicle_expense_invoice_item_total_after_invoice
after insert or update of total_amount on public.vehicle_expense_invoices
deferrable initially deferred
for each row
execute function public.validate_vehicle_expense_invoice_total();

drop trigger if exists validate_vehicle_expense_invoice_payment_total_after_payments
  on public.vehicle_expense_invoice_payments;

create constraint trigger validate_vehicle_expense_invoice_payment_total_after_payments
after insert or update or delete on public.vehicle_expense_invoice_payments
deferrable initially immediate
for each row
execute function public.validate_vehicle_expense_invoice_payment_total();

drop trigger if exists sync_vehicle_expense_invoice_status_after_total
  on public.vehicle_expense_invoices;

create trigger sync_vehicle_expense_invoice_status_after_total
after update of total_amount on public.vehicle_expense_invoices
for each row
execute function public.validate_vehicle_expense_invoice_payment_total_for_invoice();
