begin;

-- Phase 2D.2: Legacy Other Expenses -> Vendor Invoice migration.
--
-- This migration intentionally does not delete or alter legacy tables.
-- It migrates:
--   public.vehicle_expenses              -> public.vehicle_expense_invoices
--                                      + public.vehicle_expense_invoice_items
--                                      + public.vehicle_expense_invoice_item_vehicles
--   public.vehicle_expense_payments      -> public.vehicle_expense_payment_batches
--   public.vehicle_expense_payment_items -> public.vehicle_expense_payment_allocations
--
-- UUID strategy:
--   New UUIDs are generated for migrated rows. Legacy UUIDs are preserved in
--   remarks as stable markers, then used to build temporary crosswalks.
--
-- Idempotency:
--   Re-running this migration should not duplicate migrated invoices, payment
--   batches, invoice items, vehicle links, or allocations. Existing migrated
--   rows are found by their legacy marker in remarks.
--
-- Business decisions:
--   - One legacy expense becomes one vendor invoice and one invoice item.
--   - Missing/blank legacy vendors become "Unknown Vendor".
--   - Mixed-vendor legacy payments become "Mixed Vendors".
--   - Unsupported legacy fields are appended to invoice remarks.
--   - Legacy tables are retained for Phase 2E cleanup.

set constraints all deferred;

create temp table legacy_vehicle_expense_invoice_xwalk (
  legacy_expense_id uuid primary key,
  invoice_id uuid not null unique
) on commit drop;

create temp table legacy_vehicle_expense_item_xwalk (
  legacy_expense_id uuid primary key,
  invoice_item_id uuid not null unique
) on commit drop;

create temp table legacy_vehicle_expense_payment_xwalk (
  legacy_payment_id uuid primary key,
  payment_batch_id uuid not null unique
) on commit drop;

-- ---------------------------------------------------------------------------
-- 1. Create invoices from legacy expenses.
-- ---------------------------------------------------------------------------

insert into public.vehicle_expense_invoices (
  vendor_name,
  invoice_number,
  invoice_date,
  due_date,
  total_amount,
  status,
  remarks,
  created_by,
  created_at,
  updated_at
)
select
  coalesce(nullif(btrim(e.vendor), ''), 'Unknown Vendor') as vendor_name,
  nullif(btrim(e.invoice_reference), '') as invoice_number,
  e.expense_date as invoice_date,
  null::date as due_date,
  e.amount as total_amount,
  'unpaid' as status,
  concat_ws(
    E'\n',
    'Migrated from legacy Other Expenses.',
    'Legacy Expense ID: ' || e.id::text,
    case
      when nullif(btrim(e.vendor), '') is null then null
      else 'Legacy Vendor: ' || e.vendor
    end,
    case
      when nullif(btrim(e.city), '') is null then null
      else 'Legacy City: ' || e.city
    end,
    case
      when nullif(btrim(e.company), '') is null then null
      else 'Legacy Company: ' || e.company
    end,
    case
      when nullif(btrim(e.payment_mode), '') is null then null
      else 'Legacy Expense Payment Mode: ' || e.payment_mode
    end,
    case
      when e.paid_at is null then null
      else 'Legacy Paid At: ' || e.paid_at::text
    end
  ) as remarks,
  null::uuid as created_by,
  coalesce(e.created_at, now()) as created_at,
  coalesce(e.updated_at, e.created_at, now()) as updated_at
from public.vehicle_expenses e
where not exists (
  select 1
  from public.vehicle_expense_invoices i
  where i.remarks like '%Legacy Expense ID: ' || e.id::text || '%'
);

insert into legacy_vehicle_expense_invoice_xwalk (
  legacy_expense_id,
  invoice_id
)
select
  e.id,
  i.id
from public.vehicle_expenses e
join public.vehicle_expense_invoices i
  on i.remarks like '%Legacy Expense ID: ' || e.id::text || '%'
on conflict (legacy_expense_id) do nothing;

do $$
declare
  missing_count integer;
begin
  select count(*)
    into missing_count
  from public.vehicle_expenses e
  left join legacy_vehicle_expense_invoice_xwalk x
    on x.legacy_expense_id = e.id
  where x.invoice_id is null;

  if missing_count <> 0 then
    raise exception 'Legacy expense invoice crosswalk missing % rows', missing_count;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Create one invoice item for each legacy expense.
-- ---------------------------------------------------------------------------

insert into public.vehicle_expense_invoice_items (
  invoice_id,
  vehicle_id,
  expense_type,
  description,
  amount,
  created_at
)
select
  x.invoice_id,
  e.vehicle_id,
  e.expense_type,
  e.description,
  e.amount,
  coalesce(e.created_at, now())
from public.vehicle_expenses e
join legacy_vehicle_expense_invoice_xwalk x
  on x.legacy_expense_id = e.id
where not exists (
  select 1
  from public.vehicle_expense_invoice_items ii
  where ii.invoice_id = x.invoice_id
);

insert into legacy_vehicle_expense_item_xwalk (
  legacy_expense_id,
  invoice_item_id
)
select
  e.id,
  ii.id
from public.vehicle_expenses e
join legacy_vehicle_expense_invoice_xwalk x
  on x.legacy_expense_id = e.id
join public.vehicle_expense_invoice_items ii
  on ii.invoice_id = x.invoice_id
on conflict (legacy_expense_id) do nothing;

do $$
declare
  bad_item_count integer;
begin
  select count(*)
    into bad_item_count
  from (
    select invoice_id, count(*) as item_count
    from public.vehicle_expense_invoice_items
    where invoice_id in (
      select invoice_id
      from legacy_vehicle_expense_invoice_xwalk
    )
    group by invoice_id
    having count(*) <> 1
  ) bad;

  if bad_item_count <> 0 then
    raise exception 'Expected exactly one migrated invoice item per migrated invoice; bad invoice count %', bad_item_count;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Create invoice item vehicle links for vehicle-scoped legacy expenses.
-- ---------------------------------------------------------------------------

insert into public.vehicle_expense_invoice_item_vehicles (
  invoice_item_id,
  vehicle_id,
  created_at
)
select
  x.invoice_item_id,
  e.vehicle_id,
  coalesce(e.created_at, now())
from public.vehicle_expenses e
join legacy_vehicle_expense_item_xwalk x
  on x.legacy_expense_id = e.id
where e.vehicle_id is not null
on conflict (invoice_item_id, vehicle_id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Verify invoice totals before migrating payments.
-- ---------------------------------------------------------------------------

do $$
declare
  legacy_count integer;
  migrated_invoice_count integer;
  migrated_item_count integer;
  legacy_total numeric;
  migrated_invoice_total numeric;
  migrated_item_total numeric;
  legacy_vehicle_count integer;
  migrated_vehicle_count integer;
  legacy_general_count integer;
  migrated_general_count integer;
begin
  select count(*), coalesce(sum(amount), 0)
    into legacy_count, legacy_total
  from public.vehicle_expenses;

  select count(*), coalesce(sum(i.total_amount), 0)
    into migrated_invoice_count, migrated_invoice_total
  from legacy_vehicle_expense_invoice_xwalk x
  join public.vehicle_expense_invoices i on i.id = x.invoice_id;

  select count(*), coalesce(sum(ii.amount), 0)
    into migrated_item_count, migrated_item_total
  from legacy_vehicle_expense_item_xwalk x
  join public.vehicle_expense_invoice_items ii on ii.id = x.invoice_item_id;

  select count(*)
    into legacy_vehicle_count
  from public.vehicle_expenses
  where vehicle_id is not null;

  select count(*)
    into migrated_vehicle_count
  from legacy_vehicle_expense_item_xwalk x
  join public.vehicle_expense_invoice_items ii on ii.id = x.invoice_item_id
  where ii.vehicle_id is not null;

  select count(*)
    into legacy_general_count
  from public.vehicle_expenses
  where vehicle_id is null;

  select count(*)
    into migrated_general_count
  from legacy_vehicle_expense_item_xwalk x
  join public.vehicle_expense_invoice_items ii on ii.id = x.invoice_item_id
  where ii.vehicle_id is null;

  if legacy_count <> migrated_invoice_count then
    raise exception 'Invoice count mismatch: legacy %, migrated %', legacy_count, migrated_invoice_count;
  end if;

  if legacy_count <> migrated_item_count then
    raise exception 'Invoice item count mismatch: legacy %, migrated %', legacy_count, migrated_item_count;
  end if;

  if legacy_total <> migrated_invoice_total then
    raise exception 'Invoice total mismatch: legacy %, migrated %', legacy_total, migrated_invoice_total;
  end if;

  if legacy_total <> migrated_item_total then
    raise exception 'Invoice item total mismatch: legacy %, migrated %', legacy_total, migrated_item_total;
  end if;

  if legacy_vehicle_count <> migrated_vehicle_count then
    raise exception 'Vehicle expense count mismatch: legacy %, migrated %', legacy_vehicle_count, migrated_vehicle_count;
  end if;

  if legacy_general_count <> migrated_general_count then
    raise exception 'General expense count mismatch: legacy %, migrated %', legacy_general_count, migrated_general_count;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Create payment batches from legacy paid expense payment headers.
-- ---------------------------------------------------------------------------

insert into public.vehicle_expense_payment_batches (
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
  case
    when vendor_summary.vendor_count = 1 then vendor_summary.vendor_name
    else 'Mixed Vendors'
  end as vendor_name,
  p.payment_date,
  p.payment_mode,
  p.reference_number,
  concat_ws(
    E'\n',
    nullif(btrim(p.remarks), ''),
    'Migrated from legacy Paid Expenses.',
    'Legacy Payment ID: ' || p.id::text,
    case
      when vendor_summary.vendor_count > 1 then 'Legacy Mixed Vendors: ' || vendor_summary.vendor_names
      else null
    end
  ) as remarks,
  p.total_amount,
  null::uuid as created_by,
  coalesce(p.created_at, now()) as created_at,
  coalesce(p.updated_at, p.created_at, now()) as updated_at
from public.vehicle_expense_payments p
join lateral (
  select
    count(distinct coalesce(nullif(btrim(e.vendor), ''), 'Unknown Vendor')) as vendor_count,
    min(coalesce(nullif(btrim(e.vendor), ''), 'Unknown Vendor')) as vendor_name,
    string_agg(
      distinct coalesce(nullif(btrim(e.vendor), ''), 'Unknown Vendor'),
      ', '
      order by coalesce(nullif(btrim(e.vendor), ''), 'Unknown Vendor')
    ) as vendor_names
  from public.vehicle_expense_payment_items pi
  join public.vehicle_expenses e on e.id = pi.expense_id
  where pi.payment_id = p.id
) vendor_summary on true
where not exists (
  select 1
  from public.vehicle_expense_payment_batches b
  where b.remarks like '%Legacy Payment ID: ' || p.id::text || '%'
);

insert into legacy_vehicle_expense_payment_xwalk (
  legacy_payment_id,
  payment_batch_id
)
select
  p.id,
  b.id
from public.vehicle_expense_payments p
join public.vehicle_expense_payment_batches b
  on b.remarks like '%Legacy Payment ID: ' || p.id::text || '%'
on conflict (legacy_payment_id) do nothing;

do $$
declare
  missing_count integer;
begin
  select count(*)
    into missing_count
  from public.vehicle_expense_payments p
  left join legacy_vehicle_expense_payment_xwalk x
    on x.legacy_payment_id = p.id
  where x.payment_batch_id is null;

  if missing_count <> 0 then
    raise exception 'Legacy payment batch crosswalk missing % rows', missing_count;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Create allocations from legacy payment items.
-- ---------------------------------------------------------------------------

insert into public.vehicle_expense_payment_allocations (
  payment_batch_id,
  invoice_id,
  allocated_amount,
  created_at
)
select
  px.payment_batch_id,
  ix.invoice_id,
  pi.amount,
  coalesce(pi.created_at, now())
from public.vehicle_expense_payment_items pi
join legacy_vehicle_expense_payment_xwalk px
  on px.legacy_payment_id = pi.payment_id
join legacy_vehicle_expense_invoice_xwalk ix
  on ix.legacy_expense_id = pi.expense_id
where not exists (
  select 1
  from public.vehicle_expense_payment_allocations a
  where a.payment_batch_id = px.payment_batch_id
    and a.invoice_id = ix.invoice_id
);

-- ---------------------------------------------------------------------------
-- 7. Verify payment totals and allocation integrity.
-- ---------------------------------------------------------------------------

do $$
declare
  legacy_payment_count integer;
  migrated_batch_count integer;
  legacy_payment_total numeric;
  migrated_batch_total numeric;
  legacy_allocation_count integer;
  migrated_allocation_count integer;
  legacy_allocation_total numeric;
  migrated_allocation_total numeric;
  orphan_allocation_count integer;
  orphan_item_count integer;
  overpayment_count integer;
begin
  select count(*), coalesce(sum(total_amount), 0)
    into legacy_payment_count, legacy_payment_total
  from public.vehicle_expense_payments;

  select count(*), coalesce(sum(b.total_amount), 0)
    into migrated_batch_count, migrated_batch_total
  from legacy_vehicle_expense_payment_xwalk x
  join public.vehicle_expense_payment_batches b on b.id = x.payment_batch_id;

  select count(*), coalesce(sum(amount), 0)
    into legacy_allocation_count, legacy_allocation_total
  from public.vehicle_expense_payment_items;

  select count(*), coalesce(sum(a.allocated_amount), 0)
    into migrated_allocation_count, migrated_allocation_total
  from public.vehicle_expense_payment_allocations a
  join legacy_vehicle_expense_payment_xwalk px
    on px.payment_batch_id = a.payment_batch_id;

  select count(*)
    into orphan_allocation_count
  from public.vehicle_expense_payment_allocations a
  join legacy_vehicle_expense_payment_xwalk px
    on px.payment_batch_id = a.payment_batch_id
  left join public.vehicle_expense_invoices i on i.id = a.invoice_id
  left join public.vehicle_expense_payment_batches b on b.id = a.payment_batch_id
  where i.id is null or b.id is null;

  select count(*)
    into orphan_item_count
  from legacy_vehicle_expense_item_xwalk x
  left join public.vehicle_expense_invoices i
    on i.id = (select invoice_id from public.vehicle_expense_invoice_items where id = x.invoice_item_id)
  left join public.vehicle_expense_invoice_items ii on ii.id = x.invoice_item_id
  where i.id is null or ii.id is null;

  select count(*)
    into overpayment_count
  from (
    select
      i.id,
      i.total_amount,
      coalesce(sum(a.allocated_amount), 0) as paid_amount
    from public.vehicle_expense_invoices i
    join legacy_vehicle_expense_invoice_xwalk x on x.invoice_id = i.id
    left join public.vehicle_expense_payment_allocations a on a.invoice_id = i.id
    group by i.id
    having coalesce(sum(a.allocated_amount), 0) > i.total_amount
  ) overpaid;

  if legacy_payment_count <> migrated_batch_count then
    raise exception 'Payment count mismatch: legacy %, migrated %', legacy_payment_count, migrated_batch_count;
  end if;

  if legacy_payment_total <> migrated_batch_total then
    raise exception 'Payment total mismatch: legacy %, migrated %', legacy_payment_total, migrated_batch_total;
  end if;

  if legacy_allocation_count <> migrated_allocation_count then
    raise exception 'Allocation count mismatch: legacy %, migrated %', legacy_allocation_count, migrated_allocation_count;
  end if;

  if legacy_allocation_total <> migrated_allocation_total then
    raise exception 'Allocation total mismatch: legacy %, migrated %', legacy_allocation_total, migrated_allocation_total;
  end if;

  if orphan_allocation_count <> 0 then
    raise exception 'Found % orphan migrated allocations', orphan_allocation_count;
  end if;

  if orphan_item_count <> 0 then
    raise exception 'Found % orphan migrated invoice items', orphan_item_count;
  end if;

  if overpayment_count <> 0 then
    raise exception 'Found % overpaid migrated invoices', overpayment_count;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Recalculate migrated invoice statuses.
-- ---------------------------------------------------------------------------

do $$
declare
  invoice_record record;
begin
  for invoice_record in
    select invoice_id
    from legacy_vehicle_expense_invoice_xwalk
  loop
    perform public.sync_vehicle_expense_invoice_status(invoice_record.invoice_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Final verification. These checks intentionally run before COMMIT so any
-- integrity violation aborts the full migration.
-- ---------------------------------------------------------------------------

do $$
declare
  bad_status_count integer;
  old_outstanding numeric;
  new_outstanding numeric;
  payment_header_mismatch_count integer;
begin
  select count(*)
    into payment_header_mismatch_count
  from (
    select
      p.id,
      p.total_amount,
      coalesce(sum(pi.amount), 0) as item_total
    from public.vehicle_expense_payments p
    left join public.vehicle_expense_payment_items pi on pi.payment_id = p.id
    group by p.id
    having p.total_amount <> coalesce(sum(pi.amount), 0)
  ) mismatched;

  if payment_header_mismatch_count <> 0 then
    raise exception 'Found % legacy payment headers whose total does not equal item total', payment_header_mismatch_count;
  end if;

  select coalesce(sum(e.amount), 0)
    into old_outstanding
  from public.vehicle_expenses e
  where not exists (
    select 1
    from public.vehicle_expense_payment_items pi
    where pi.expense_id = e.id
  );

  select coalesce(sum(i.total_amount - paid.paid_amount), 0)
    into new_outstanding
  from public.vehicle_expense_invoices i
  join legacy_vehicle_expense_invoice_xwalk x on x.invoice_id = i.id
  left join lateral (
    select coalesce(sum(a.allocated_amount), 0) as paid_amount
    from public.vehicle_expense_payment_allocations a
    where a.invoice_id = i.id
  ) paid on true;

  if old_outstanding <> new_outstanding then
    raise exception 'Outstanding total mismatch: legacy %, migrated %', old_outstanding, new_outstanding;
  end if;

  select count(*)
    into bad_status_count
  from (
    select
      i.id,
      i.status,
      i.total_amount,
      coalesce(sum(a.allocated_amount), 0) as paid_amount
    from public.vehicle_expense_invoices i
    join legacy_vehicle_expense_invoice_xwalk x on x.invoice_id = i.id
    left join public.vehicle_expense_payment_allocations a on a.invoice_id = i.id
    group by i.id
    having (
        coalesce(sum(a.allocated_amount), 0) = 0
        and i.status <> 'unpaid'
      )
      or (
        coalesce(sum(a.allocated_amount), 0) > 0
        and coalesce(sum(a.allocated_amount), 0) < i.total_amount
        and i.status <> 'partially_paid'
      )
      or (
        coalesce(sum(a.allocated_amount), 0) >= i.total_amount
        and i.status <> 'paid'
      )
  ) bad_status;

  if bad_status_count <> 0 then
    raise exception 'Found % migrated invoices with incorrect derived status', bad_status_count;
  end if;
end;
$$;

-- Read-only post-migration summary. Migration runners may display these rows.
select
  'legacy_expenses' as metric,
  count(*)::numeric as value
from public.vehicle_expenses
union all
select
  'migrated_invoices',
  count(*)::numeric
from legacy_vehicle_expense_invoice_xwalk
union all
select
  'legacy_expense_total',
  coalesce(sum(amount), 0)
from public.vehicle_expenses
union all
select
  'migrated_invoice_total',
  coalesce(sum(i.total_amount), 0)
from legacy_vehicle_expense_invoice_xwalk x
join public.vehicle_expense_invoices i on i.id = x.invoice_id
union all
select
  'legacy_payments',
  count(*)::numeric
from public.vehicle_expense_payments
union all
select
  'migrated_payment_batches',
  count(*)::numeric
from legacy_vehicle_expense_payment_xwalk
union all
select
  'legacy_payment_total',
  coalesce(sum(total_amount), 0)
from public.vehicle_expense_payments
union all
select
  'migrated_payment_batch_total',
  coalesce(sum(b.total_amount), 0)
from legacy_vehicle_expense_payment_xwalk x
join public.vehicle_expense_payment_batches b on b.id = x.payment_batch_id;

commit;
