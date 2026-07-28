with one_paisa_underpaid as (
  select
    i.id as invoice_id,
    (array_agg(a.id order by a.created_at desc))[1] as allocation_id
  from public.vehicle_expense_invoices i
  join public.vehicle_expense_payment_allocations a
    on a.invoice_id = i.id
  group by i.id
  having count(a.id) = 1
    and round((i.total_amount - coalesce(sum(a.allocated_amount), 0))::numeric, 2) = 0.01
)
update public.vehicle_expense_payment_allocations a
set allocated_amount = round((a.allocated_amount + 0.01)::numeric, 2)
from one_paisa_underpaid u
where a.id = u.allocation_id;

with affected_batches as (
  select distinct payment_batch_id
  from public.vehicle_expense_payment_allocations
),
allocation_totals as (
  select
    payment_batch_id,
    round(sum(allocated_amount)::numeric, 2) as total_amount
  from public.vehicle_expense_payment_allocations
  where payment_batch_id in (select payment_batch_id from affected_batches)
  group by payment_batch_id
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
    select distinct i.id
    from public.vehicle_expense_invoices i
    join public.vehicle_expense_payment_allocations a
      on a.invoice_id = i.id
  loop
    perform public.sync_vehicle_expense_invoice_status(invoice_record.id);
  end loop;
end;
$$;
