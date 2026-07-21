create table if not exists public.vehicle_expense_payment_batches (
  id uuid primary key default gen_random_uuid(),
  vendor_name text not null,
  payment_date date not null,
  payment_mode text,
  reference_number text,
  remarks text,
  total_amount numeric(12, 2) not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicle_expense_payment_batches_vendor_name_not_blank check (btrim(vendor_name) <> ''),
  constraint vehicle_expense_payment_batches_total_amount_positive check (total_amount > 0)
);

create table if not exists public.vehicle_expense_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_batch_id uuid not null references public.vehicle_expense_payment_batches(id) on delete cascade,
  invoice_id uuid not null references public.vehicle_expense_invoices(id) on delete restrict,
  allocated_amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),

  constraint vehicle_expense_payment_allocations_amount_positive check (allocated_amount > 0),
  constraint vehicle_expense_payment_allocations_batch_invoice_unique unique (payment_batch_id, invoice_id)
);

create index if not exists vehicle_expense_payment_batches_vendor_name_idx
  on public.vehicle_expense_payment_batches (vendor_name);

create index if not exists vehicle_expense_payment_batches_payment_date_idx
  on public.vehicle_expense_payment_batches (payment_date desc);

create index if not exists vehicle_expense_payment_allocations_batch_id_idx
  on public.vehicle_expense_payment_allocations (payment_batch_id);

create index if not exists vehicle_expense_payment_allocations_invoice_id_idx
  on public.vehicle_expense_payment_allocations (invoice_id);

drop trigger if exists set_vehicle_expense_payment_batches_updated_at
  on public.vehicle_expense_payment_batches;

create trigger set_vehicle_expense_payment_batches_updated_at
before update on public.vehicle_expense_payment_batches
for each row
execute function public.set_fuel_tracking_updated_at();

insert into public.vehicle_expense_payment_batches (
  id,
  vendor_name,
  payment_date,
  payment_mode,
  reference_number,
  remarks,
  total_amount,
  created_by,
  created_at,
  updated_at
)
select
  p.id,
  i.vendor_name,
  p.payment_date,
  p.payment_mode,
  p.reference_number,
  p.remarks,
  p.amount,
  p.created_by,
  p.created_at,
  p.created_at
from public.vehicle_expense_invoice_payments p
join public.vehicle_expense_invoices i on i.id = p.invoice_id
where not exists (
  select 1
  from public.vehicle_expense_payment_batches b
  where b.id = p.id
);

insert into public.vehicle_expense_payment_allocations (
  payment_batch_id,
  invoice_id,
  allocated_amount,
  created_at
)
select
  p.id,
  p.invoice_id,
  p.amount,
  p.created_at
from public.vehicle_expense_invoice_payments p
where not exists (
  select 1
  from public.vehicle_expense_payment_allocations a
  where a.payment_batch_id = p.id
    and a.invoice_id = p.invoice_id
);

create or replace function public.vehicle_expense_invoice_paid_total(invoice_uuid uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(allocated_amount), 0)
  from public.vehicle_expense_payment_allocations
  where invoice_id = invoice_uuid;
$$;

create or replace function public.validate_vehicle_expense_payment_batch_total()
returns trigger
language plpgsql
as $$
declare
  batch_uuid uuid;
  batch_total numeric;
  allocation_total numeric;
begin
  batch_uuid := coalesce(new.payment_batch_id, old.payment_batch_id);

  select total_amount
    into batch_total
  from public.vehicle_expense_payment_batches
  where id = batch_uuid;

  if batch_total is null then
    return null;
  end if;

  select coalesce(sum(allocated_amount), 0)
    into allocation_total
  from public.vehicle_expense_payment_allocations
  where payment_batch_id = batch_uuid;

  if allocation_total <> batch_total then
    raise exception 'Payment batch total_amount must equal sum of allocations';
  end if;

  return null;
end;
$$;

create or replace function public.validate_vehicle_expense_payment_batch_total_for_batch()
returns trigger
language plpgsql
as $$
declare
  allocation_total numeric;
begin
  select coalesce(sum(allocated_amount), 0)
    into allocation_total
  from public.vehicle_expense_payment_allocations
  where payment_batch_id = new.id;

  if allocation_total <> new.total_amount then
    raise exception 'Payment batch total_amount must equal sum of allocations';
  end if;

  return null;
end;
$$;

create or replace function public.validate_vehicle_expense_invoice_allocation_total()
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

drop trigger if exists validate_vehicle_expense_payment_batch_total_after_allocations
  on public.vehicle_expense_payment_allocations;

create constraint trigger validate_vehicle_expense_payment_batch_total_after_allocations
after insert or update or delete on public.vehicle_expense_payment_allocations
deferrable initially deferred
for each row
execute function public.validate_vehicle_expense_payment_batch_total();

drop trigger if exists validate_vehicle_expense_payment_batch_total_after_batch
  on public.vehicle_expense_payment_batches;

create constraint trigger validate_vehicle_expense_payment_batch_total_after_batch
after insert or update of total_amount on public.vehicle_expense_payment_batches
deferrable initially deferred
for each row
execute function public.validate_vehicle_expense_payment_batch_total_for_batch();

drop trigger if exists validate_vehicle_expense_invoice_allocation_total_after_allocations
  on public.vehicle_expense_payment_allocations;

create constraint trigger validate_vehicle_expense_invoice_allocation_total_after_allocations
after insert or update or delete on public.vehicle_expense_payment_allocations
deferrable initially immediate
for each row
execute function public.validate_vehicle_expense_invoice_allocation_total();

do $$
declare
  invoice_record record;
begin
  for invoice_record in select id from public.vehicle_expense_invoices loop
    perform public.sync_vehicle_expense_invoice_status(invoice_record.id);
  end loop;
end;
$$;
