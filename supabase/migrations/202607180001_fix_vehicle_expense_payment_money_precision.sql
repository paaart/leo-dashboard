drop trigger if exists validate_vehicle_expense_invoice_item_total_after_items
  on public.vehicle_expense_invoice_items;

drop trigger if exists validate_vehicle_expense_invoice_item_total_after_invoice
  on public.vehicle_expense_invoices;

drop trigger if exists validate_vehicle_expense_invoice_payment_total_after_payments
  on public.vehicle_expense_invoice_payments;

drop trigger if exists sync_vehicle_expense_invoice_status_after_total
  on public.vehicle_expense_invoices;

drop trigger if exists validate_vehicle_expense_payment_batch_total_after_allocations
  on public.vehicle_expense_payment_allocations;

drop trigger if exists validate_vehicle_expense_payment_batch_total_after_batch
  on public.vehicle_expense_payment_batches;

drop trigger if exists validate_vehicle_expense_invoice_allocation_total_after_allocations
  on public.vehicle_expense_payment_allocations;

alter table public.vehicle_expense_invoices
  alter column total_amount type numeric(14, 2);

alter table public.vehicle_expense_invoice_items
  alter column amount type numeric(14, 2);

alter table public.vehicle_expense_invoice_payments
  alter column amount type numeric(14, 2);

alter table public.vehicle_expense_payment_batches
  alter column total_amount type numeric(14, 2);

alter table public.vehicle_expense_payment_allocations
  alter column allocated_amount type numeric(14, 2);

create or replace function public.sync_vehicle_expense_invoice_status(invoice_uuid uuid)
returns void
language plpgsql
as $$
declare
  invoice_total numeric(14, 2);
  paid_total numeric(14, 2);
  next_status text;
begin
  select round(total_amount::numeric, 2)
    into invoice_total
  from public.vehicle_expense_invoices
  where id = invoice_uuid;

  if invoice_total is null then
    return;
  end if;

  paid_total := round(public.vehicle_expense_invoice_paid_total(invoice_uuid)::numeric, 2);

  if round((invoice_total - paid_total)::numeric, 2) <= 0 then
    next_status := 'paid';
  elsif paid_total > 0 then
    next_status := 'partially_paid';
  else
    next_status := 'unpaid';
  end if;

  update public.vehicle_expense_invoices
  set status = next_status
  where id = invoice_uuid;
end;
$$;

create or replace function public.validate_vehicle_expense_invoice_allocation_total()
returns trigger
language plpgsql
as $$
declare
  invoice_uuid uuid;
  invoice_total numeric(14, 2);
  paid_total numeric(14, 2);
begin
  invoice_uuid := coalesce(new.invoice_id, old.invoice_id);

  select round(total_amount::numeric, 2)
    into invoice_total
  from public.vehicle_expense_invoices
  where id = invoice_uuid;

  if invoice_total is null then
    return null;
  end if;

  paid_total := round(public.vehicle_expense_invoice_paid_total(invoice_uuid)::numeric, 2);

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
  paid_total numeric(14, 2);
begin
  paid_total := round(public.vehicle_expense_invoice_paid_total(new.id)::numeric, 2);

  if paid_total > round(new.total_amount::numeric, 2) then
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

with one_paisa_underpaid as (
  select
    i.id as invoice_id,
    (array_agg(a.id))[1] as allocation_id,
    (array_agg(b.id))[1] as payment_batch_id
  from public.vehicle_expense_invoices i
  join public.vehicle_expense_payment_allocations a
    on a.invoice_id = i.id
  join public.vehicle_expense_payment_batches b
    on b.id = a.payment_batch_id
  group by i.id
  having count(a.id) = 1
    and round((i.total_amount - coalesce(sum(a.allocated_amount), 0))::numeric, 2) = 0.01
)
update public.vehicle_expense_payment_allocations a
set allocated_amount = a.allocated_amount + 0.01
from one_paisa_underpaid u
where a.id = u.allocation_id;

with affected as (
  select distinct payment_batch_id
  from public.vehicle_expense_payment_allocations
)
update public.vehicle_expense_payment_batches b
set total_amount = allocation_totals.total_amount
from (
  select
    payment_batch_id,
    round(sum(allocated_amount)::numeric, 2) as total_amount
  from public.vehicle_expense_payment_allocations
  where payment_batch_id in (select payment_batch_id from affected)
  group by payment_batch_id
) allocation_totals
where b.id = allocation_totals.payment_batch_id
  and b.total_amount <> allocation_totals.total_amount;

do $$
declare
  invoice_record record;
begin
  for invoice_record in select id from public.vehicle_expense_invoices loop
    perform public.sync_vehicle_expense_invoice_status(invoice_record.id);
  end loop;
end;
$$;
