create temporary table one_paisa_short_invoice_repairs on commit drop as
with one_paisa_short_invoices as (
  select
    i.id as invoice_id,
    round((i.total_amount - coalesce(sum(a.allocated_amount), 0))::numeric, 2) as balance_amount
  from public.vehicle_expense_invoices i
  join public.vehicle_expense_payment_allocations a
    on a.invoice_id = i.id
  group by i.id, i.total_amount
  having round((i.total_amount - coalesce(sum(a.allocated_amount), 0))::numeric, 2) = 0.01
),
latest_allocation as (
  select
    ranked.allocation_id,
    ranked.invoice_id,
    ranked.payment_batch_id
  from (
    select
      a.id as allocation_id,
      a.invoice_id,
      a.payment_batch_id,
      row_number() over (
        partition by a.invoice_id
        order by a.created_at desc, b.created_at desc, a.id desc
      ) as row_number
    from public.vehicle_expense_payment_allocations a
    join public.vehicle_expense_payment_batches b
      on b.id = a.payment_batch_id
    join one_paisa_short_invoices short_invoice
      on short_invoice.invoice_id = a.invoice_id
  ) ranked
  where ranked.row_number = 1
)
select *
from latest_allocation;

update public.vehicle_expense_payment_allocations a
set allocated_amount = round((a.allocated_amount + 0.01)::numeric, 2)
from one_paisa_short_invoice_repairs repair
where a.id = repair.allocation_id;

with allocation_totals as (
  select
    a.payment_batch_id,
    round(sum(a.allocated_amount)::numeric, 2) as total_amount
  from public.vehicle_expense_payment_allocations a
  where a.payment_batch_id in (
    select payment_batch_id from one_paisa_short_invoice_repairs
  )
  group by a.payment_batch_id
)
update public.vehicle_expense_payment_batches b
set total_amount = allocation_totals.total_amount
from allocation_totals
where b.id = allocation_totals.payment_batch_id
  and b.total_amount <> allocation_totals.total_amount;

do $$
declare
  invoice_record record;
begin
  for invoice_record in
    select distinct invoice_id as id
    from one_paisa_short_invoice_repairs
  loop
    perform public.sync_vehicle_expense_invoice_status(invoice_record.id);
  end loop;
end;
$$;
