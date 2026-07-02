# Vehicle Other Expenses Legacy Migration Plan

Phase: 2D.1 Legacy Other Expenses Migration Analysis  
Status: Phase 2D.2 migration generated. Migration not yet executed.

Phase 2D.2 generated migration:

- `supabase/migrations/202607010001_migrate_legacy_vehicle_expenses_to_vendor_invoices.sql`
- Generated only; not executed by Codex.
- Legacy tables are retained.
- Cleanup remains pending for Phase 2E after business verification.

## 1. Legacy Architecture

The legacy Other Expenses flow stores each expense as the payable unit.

Tables:

| Table | Purpose | Key relationships |
| --- | --- | --- |
| `vehicle_expenses` | Legacy non-fuel expense records. One row represents one payable expense line. | `vehicle_id` references `vehicles(id)` and is nullable after general-expense support. `payment_id` references `vehicle_expense_payments(id)`. |
| `vehicle_expense_payments` | Legacy payment header. One row represents a payment run over one or more pending expenses. | Referenced by `vehicle_expense_payment_items.payment_id` and `vehicle_expenses.payment_id`. |
| `vehicle_expense_payment_items` | Legacy payment-to-expense link table. | `payment_id` references `vehicle_expense_payments(id)` with cascade delete. `expense_id` references `vehicle_expenses(id)` with restrict delete. `expense_id` is unique, so one expense can be paid only once. |

Legacy business rules observed:

- `vehicle_expenses.amount > 0`.
- `vehicle_expenses.expense_type` must not be blank.
- `vehicle_expenses.status` is constrained to `pending` or `paid`.
- `vehicle_expenses.vehicle_id` was originally required, then made nullable to support general expenses.
- Creating a legacy payment selects only `pending` expenses, inserts a payment header, inserts one payment item per expense, and marks all selected expenses as `paid`.
- Legacy payment amounts are all-or-nothing per expense. Partial payment is not represented.
- Paid legacy expenses cannot be edited or deleted through the API.
- Legacy payment delete API was not found; payment reversals may require manual review if they exist outside the current UI.

Legacy payment workflow:

1. User creates Other Expense rows as `pending` or `paid`.
2. User selects pending expenses in Paid Expenses.
3. API creates `vehicle_expense_payments.total_amount = sum(selected expense amounts)`.
4. API creates `vehicle_expense_payment_items` rows.
5. API updates selected `vehicle_expenses` rows to `paid`, sets `paid_at = now()`, and stores `payment_id`.

## 2. New Architecture

The new Vendor Invoice flow separates vendor invoices, line items, payment batches, and payment allocations.

Tables:

| Table | Purpose | Key relationships |
| --- | --- | --- |
| `vehicle_expense_invoices` | Vendor invoice header. | Has many invoice items. Status is derived from payment allocations. |
| `vehicle_expense_invoice_items` | Invoice line items. | `invoice_id` references invoices with cascade delete. `vehicle_id` is nullable for general expenses. |
| `vehicle_expense_invoice_item_vehicles` | Optional item-to-vehicle join table. | Supports multiple vehicles per invoice item, while `vehicle_expense_invoice_items.vehicle_id` remains a compatibility/primary vehicle field. |
| `vehicle_expense_payment_batches` | Vendor payment header. | Has many allocations. One payment batch can cover multiple invoices. |
| `vehicle_expense_payment_allocations` | Payment-to-invoice allocation rows. | `payment_batch_id` references batches with cascade delete. `invoice_id` references invoices with restrict delete. Unique per `(payment_batch_id, invoice_id)`. |
| `vehicle_expense_invoice_payments` | Phase 2A one-payment-per-invoice compatibility table. | Superseded by payment batches and allocations. Existing rows were copied into batches/allocations by the Phase 2C.1 migration. |

New business rules observed:

- Invoice total must equal the sum of invoice item amounts.
- Payment batch total must equal the sum of allocations.
- Allocated amount must be positive.
- Sum of allocations for an invoice cannot exceed `vehicle_expense_invoices.total_amount`.
- Invoice status is derived from allocation totals:
  - `0` paid => `unpaid`
  - `0 < paid < total` => `partially_paid`
  - `paid >= total` => `paid`
- Invoice items cannot be replaced after allocations exist.
- Invoices with allocations cannot be deleted.
- Deleting a payment batch deletes its allocations and triggers invoice status recalculation.

## 3. Table Mapping

| Legacy table | New table(s) | Confidence | Notes |
| --- | --- | --- | --- |
| `vehicle_expenses` | `vehicle_expense_invoices`, `vehicle_expense_invoice_items`, optional `vehicle_expense_invoice_item_vehicles` | Medium | Each legacy expense can become one invoice with one item. Grouping multiple legacy expenses into one invoice may be possible by vendor/invoice/date/reference but needs business confirmation. |
| `vehicle_expense_payments` | `vehicle_expense_payment_batches` | High | One legacy payment maps naturally to one payment batch. |
| `vehicle_expense_payment_items` | `vehicle_expense_payment_allocations` | Medium | Legacy items link payments to expenses. If each legacy expense becomes one invoice, each item becomes one allocation to that invoice. |
| `vehicle_expenses.payment_id` | `vehicle_expense_payment_allocations` via migrated invoice id | Medium | Redundant with `vehicle_expense_payment_items`; should be verified for mismatches before migration. |

Recommended default mapping:

- One legacy `vehicle_expenses` row => one new invoice header + one invoice item.
- One legacy `vehicle_expense_payments` row => one new payment batch.
- One legacy `vehicle_expense_payment_items` row => one allocation from the batch to the migrated invoice.

This preserves amounts and statuses without inventing invoice grouping rules.

## 4. Column Mapping

### `vehicle_expenses` to invoice and invoice item

| Legacy column | New column | Transformation |
| --- | --- | --- |
| `id` | Migration crosswalk only | Do not reuse unless Phase 2D.2 chooses deterministic ids. Store in a temporary/reporting crosswalk during migration. |
| `expense_date` | `vehicle_expense_invoices.invoice_date` | Direct mapping. |
| `expense_date` | `vehicle_expense_invoices.due_date` | No direct legacy field. Recommended `null`. |
| `vehicle_id` | `vehicle_expense_invoice_items.vehicle_id` | Direct mapping. `null` means general expense. |
| `vehicle_id` | `vehicle_expense_invoice_item_vehicles.vehicle_id` | Insert one join row when non-null, if preserving the join-table pattern. |
| `expense_type` | `vehicle_expense_invoice_items.expense_type` | Direct mapping. |
| `description` | `vehicle_expense_invoice_items.description` | Direct mapping. |
| `amount` | `vehicle_expense_invoices.total_amount` | Direct mapping if using one invoice per expense. |
| `amount` | `vehicle_expense_invoice_items.amount` | Direct mapping. |
| `vendor` | `vehicle_expense_invoices.vendor_name` | Direct mapping when present. Needs fallback when null/blank because new column is required. |
| `invoice_reference` | `vehicle_expense_invoices.invoice_number` | Direct mapping. Nullable is supported. |
| `city` | `vehicle_expense_invoices.remarks` or no destination | No direct destination. Recommended append to remarks only if business wants it preserved visibly. |
| `payment_mode` | No invoice destination | Legacy expense-level payment mode conflicts with new batch-level payment mode. Use payment batch mode when a payment exists. |
| `company` | No invoice destination | No direct destination. Vehicle company may already exist on `vehicles`; otherwise potential data loss. |
| `status` | `vehicle_expense_invoices.status` | Do not directly trust. Derive from migrated allocations. Pending/unpaid maps to no allocation. Paid maps through payment item allocation. |
| `paid_at` | No direct destination | No direct field. Payment date should come from `vehicle_expense_payments.payment_date`; use `paid_at` only as fallback if payment header is missing and business approves. |
| `payment_id` | `vehicle_expense_payment_allocations.payment_batch_id` | Indirect mapping through `vehicle_expense_payment_items`. Verify consistency. |
| `created_at` | `vehicle_expense_invoices.created_at` and item `created_at` | Direct mapping if preserving audit timestamps is approved. Otherwise defaults to migration time. |
| `updated_at` | `vehicle_expense_invoices.updated_at` | Direct mapping if preserving audit timestamps is approved. |

### `vehicle_expense_payments` to payment batches

| Legacy column | New column | Transformation |
| --- | --- | --- |
| `id` | `vehicle_expense_payment_batches.id` | Can be reused if no conflict and preserving identity is desired. Otherwise use generated id and crosswalk. |
| `payment_date` | `payment_date` | Direct mapping. |
| `payment_mode` | `payment_mode` | Direct mapping. |
| `reference_number` | `reference_number` | Direct mapping. |
| `remarks` | `remarks` | Direct mapping. |
| `total_amount` | `total_amount` | Direct mapping, must equal sum of migrated allocations. |
| `created_at` | `created_at` | Direct mapping if preserving audit timestamps. |
| `updated_at` | `updated_at` | Direct mapping if preserving audit timestamps. |
| none | `vendor_name` | Required in new table. Recommended derive from covered invoices if all vendors match; otherwise use a fallback such as `Mixed Vendors` only if business approves. |
| none | `created_by` | No legacy source. Recommended `null`. |

### `vehicle_expense_payment_items` to allocations

| Legacy column | New column | Transformation |
| --- | --- | --- |
| `id` | `vehicle_expense_payment_allocations.id` | Can be reused if desired and conflict-free. |
| `payment_id` | `payment_batch_id` | Direct mapping via payment batch crosswalk. |
| `expense_id` | `invoice_id` | Map through expense-to-invoice crosswalk. |
| `amount` | `allocated_amount` | Direct mapping. Should equal migrated invoice total in one-expense-per-invoice migration. |
| `created_at` | `created_at` | Direct mapping if preserving audit timestamps. |

## 5. Business Rule Mapping

Statuses:

| Legacy state | New state | Migration behavior |
| --- | --- | --- |
| `pending` expense with no payment item | `unpaid` invoice | Create invoice and item only; no allocation. |
| `paid` expense with valid payment item | `paid` invoice | Create invoice, payment batch, and allocation equal to invoice total. Status is derived. |
| Partial payment | `partially_paid` | Not representable in legacy workflow. Could appear only through inconsistent/manual data and requires review. |
| `paid` expense without valid payment item | Ambiguous | Requires manual review. Either create a synthetic payment batch or leave unpaid after business approval. |

Expense scope:

- Legacy `vehicle_id is not null` => vehicle invoice item.
- Legacy `vehicle_id is null` => general invoice item.
- New item join rows should be created for non-null vehicle ids if the join table remains part of active UI/API behavior.

Invoice numbers:

- Legacy `invoice_reference` maps to new `invoice_number`.
- Null invoice numbers are supported.
- Duplicate invoice references are possible and should not be treated as unique unless business confirms otherwise.

Vendors:

- Legacy `vendor` maps to new `vendor_name`, but new `vendor_name` is required.
- Missing vendors are a migration blocker unless a fallback value is approved.
- Legacy payment headers do not store vendor; batch vendor must be derived from covered migrated invoices.

Remarks and descriptive fields:

- Legacy expense `description` maps to invoice item `description`.
- Legacy payment `remarks` maps to payment batch `remarks`.
- Legacy expense `city`, `company`, and `payment_mode` have no exact new invoice fields.

Dates:

- Legacy `expense_date` maps to invoice date.
- Legacy payment `payment_date` maps to payment batch date.
- New invoice `due_date` should be null unless business provides a rule.
- Legacy `paid_at` is not equivalent to payment date and should not override payment header date without review.

Payment references:

- Legacy payment `reference_number` maps to payment batch `reference_number`.
- Legacy expense `invoice_reference` maps to invoice number, not payment reference.

## 6. Potential Data Loss

| Item | Risk | Detail | Recommendation |
| --- | --- | --- | --- |
| `vehicle_expenses.city` | Medium | No direct new field. | Append to invoice remarks or accept archival-only loss. |
| `vehicle_expenses.company` | Medium | No direct new field on invoice/item. | Verify whether vehicle company is sufficient. Otherwise append to remarks. |
| `vehicle_expenses.payment_mode` | Low/Medium | New payment mode belongs to payment batch, not expense. | For paid rows, use payment header mode. For unpaid rows, legacy expense-level mode has no destination. |
| `vehicle_expenses.paid_at` | Low | New architecture uses payment batch date. | Keep only if needed in remarks or audit export. |
| Missing `vendor` | High | New invoice and payment batch vendor names are required. | Decide fallback before migration. |
| Paid expense without payment item | High | New paid status requires allocation. | Manual review or synthetic payment batch policy required. |
| Payment item amount not equal to expense amount | High | Indicates partial/inconsistent legacy data. | Manual review; may migrate as partial allocation if valid. |
| Payment total not equal to sum payment items | High | New constraint requires equality. | Fix source data or define adjustment policy before migration. |
| Deleted/missing vehicle references | Medium | FK likely prevents this, but verify. | Read-only orphan check before migration. |
| Duplicate invoice references | Low | New invoice number is nullable and not unique. | Allow duplicates unless business requires grouping. |

## 7. Migration Order

Recommended safe order for Phase 2D.2:

1. Snapshot and audit legacy data with the read-only checks in this report.
2. Decide fallback policy for missing vendors and mixed-vendor payment batches.
3. Build a temporary migration crosswalk strategy for `legacy_expense_id -> new_invoice_id` and `legacy_payment_id -> new_payment_batch_id`.
4. Migrate invoices from `vehicle_expenses`.
5. Migrate invoice items and item vehicle links.
6. Verify invoice count and invoice/item amount totals.
7. Migrate payment batches from `vehicle_expense_payments`.
8. Migrate allocations from `vehicle_expense_payment_items`.
9. Verify payment totals, allocation totals, outstanding balances, and derived statuses.
10. Run UI comparison in read-only mode: old Other Expenses/Paid Expenses vs new Vendor Invoices/Vendor Payments.
11. Switch UI once business signs off.
12. Archive or remove legacy UI/code only in a later cleanup phase.

This order keeps all new invoice totals valid before inserting allocations that depend on invoices.

## 8. Verification Checklist

All queries below are read-only.

Legacy counts:

```sql
select count(*) as legacy_expense_count
from public.vehicle_expenses;

select count(*) as legacy_payment_count
from public.vehicle_expense_payments;

select count(*) as legacy_payment_item_count
from public.vehicle_expense_payment_items;
```

New counts after migration:

```sql
select count(*) as new_invoice_count
from public.vehicle_expense_invoices;

select count(*) as new_invoice_item_count
from public.vehicle_expense_invoice_items;

select count(*) as new_payment_batch_count
from public.vehicle_expense_payment_batches;

select count(*) as new_allocation_count
from public.vehicle_expense_payment_allocations;
```

Old vs new expense totals:

```sql
select coalesce(sum(amount), 0) as legacy_expense_total
from public.vehicle_expenses;

select coalesce(sum(total_amount), 0) as new_invoice_total
from public.vehicle_expense_invoices;

select coalesce(sum(amount), 0) as new_invoice_item_total
from public.vehicle_expense_invoice_items;
```

Old vs new paid totals:

```sql
select coalesce(sum(total_amount), 0) as legacy_payment_total
from public.vehicle_expense_payments;

select coalesce(sum(total_amount), 0) as new_payment_batch_total
from public.vehicle_expense_payment_batches;

select coalesce(sum(allocated_amount), 0) as new_allocation_total
from public.vehicle_expense_payment_allocations;
```

Legacy payment header vs item consistency:

```sql
select
  p.id,
  p.total_amount,
  coalesce(sum(i.amount), 0) as item_total,
  p.total_amount - coalesce(sum(i.amount), 0) as difference
from public.vehicle_expense_payments p
left join public.vehicle_expense_payment_items i on i.payment_id = p.id
group by p.id
having p.total_amount <> coalesce(sum(i.amount), 0);
```

Legacy expense status consistency:

```sql
select status, count(*) as count, coalesce(sum(amount), 0) as total_amount
from public.vehicle_expenses
group by status
order by status;

select e.id, e.status, e.payment_id, count(i.id) as payment_item_count
from public.vehicle_expenses e
left join public.vehicle_expense_payment_items i on i.expense_id = e.id
group by e.id
having (e.status = 'paid' and count(i.id) = 0)
    or (e.status = 'pending' and count(i.id) > 0);
```

Outstanding old vs new:

```sql
select coalesce(sum(amount), 0) as legacy_pending_total
from public.vehicle_expenses
where status = 'pending';

select coalesce(sum(i.total_amount - paid.paid_amount), 0) as new_outstanding_total
from public.vehicle_expense_invoices i
left join lateral (
  select coalesce(sum(a.allocated_amount), 0) as paid_amount
  from public.vehicle_expense_payment_allocations a
  where a.invoice_id = i.id
) paid on true;
```

Invoice status verification:

```sql
select
  i.id,
  i.status,
  i.total_amount,
  coalesce(sum(a.allocated_amount), 0) as paid_amount
from public.vehicle_expense_invoices i
left join public.vehicle_expense_payment_allocations a on a.invoice_id = i.id
group by i.id
having (coalesce(sum(a.allocated_amount), 0) = 0 and i.status <> 'unpaid')
    or (
      coalesce(sum(a.allocated_amount), 0) > 0
      and coalesce(sum(a.allocated_amount), 0) < i.total_amount
      and i.status <> 'partially_paid'
    )
    or (coalesce(sum(a.allocated_amount), 0) >= i.total_amount and i.status <> 'paid');
```

Vehicle/general mapping:

```sql
select
  count(*) filter (where vehicle_id is not null) as legacy_vehicle_expenses,
  count(*) filter (where vehicle_id is null) as legacy_general_expenses
from public.vehicle_expenses;

select
  count(*) filter (where vehicle_id is not null) as new_vehicle_items,
  count(*) filter (where vehicle_id is null) as new_general_items
from public.vehicle_expense_invoice_items;
```

Potential orphan checks:

```sql
select e.id, e.vehicle_id
from public.vehicle_expenses e
left join public.vehicles v on v.id = e.vehicle_id
where e.vehicle_id is not null
  and v.id is null;

select i.id, i.payment_id
from public.vehicle_expense_payment_items i
left join public.vehicle_expense_payments p on p.id = i.payment_id
where p.id is null;

select i.id, i.expense_id
from public.vehicle_expense_payment_items i
left join public.vehicle_expenses e on e.id = i.expense_id
where e.id is null;
```

Vendor quality checks:

```sql
select count(*) as missing_vendor_count
from public.vehicle_expenses
where vendor is null or btrim(vendor) = '';

select invoice_reference, vendor, count(*) as duplicate_count
from public.vehicle_expenses
where invoice_reference is not null and btrim(invoice_reference) <> ''
group by invoice_reference, vendor
having count(*) > 1
order by duplicate_count desc;
```

Mixed-vendor legacy payments:

```sql
select
  p.id as payment_id,
  count(distinct coalesce(nullif(btrim(e.vendor), ''), '<missing>')) as vendor_count,
  string_agg(distinct coalesce(nullif(btrim(e.vendor), ''), '<missing>'), ', ') as vendors
from public.vehicle_expense_payments p
join public.vehicle_expense_payment_items i on i.payment_id = p.id
join public.vehicle_expenses e on e.id = i.expense_id
group by p.id
having count(distinct coalesce(nullif(btrim(e.vendor), ''), '<missing>')) > 1;
```

## 9. Edge Cases Requiring Manual Review

- Paid legacy expenses with no `vehicle_expense_payment_items` row.
- Pending legacy expenses that already have a payment item.
- `vehicle_expenses.payment_id` that disagrees with `vehicle_expense_payment_items.payment_id`.
- Legacy payment totals that do not equal the sum of payment item amounts.
- Payment item amount that differs from the linked expense amount.
- Missing or blank vendors.
- Legacy payment batches covering multiple vendors.
- Null invoice references where business expects invoice numbers.
- Duplicate invoice references that may represent either duplicate entry or legitimate repeated references.
- Legacy general expenses where `vehicle_id` is null but description implies a vehicle.
- Rows with `city`, `company`, or expense-level `payment_mode` that users expect to see in the new UI.
- Existing new invoice/payment data that could collide with migrated records or totals.

## 10. Confidence

High confidence:

- Legacy table structure and API behavior are understood.
- New invoice/payment-batch table structure and status derivation are understood.
- One legacy expense can safely map to one new invoice plus one item.
- One legacy payment can safely map to one new payment batch when all payment items are valid.

Medium confidence:

- Vendor derivation for payment batches, because legacy payments do not store vendor directly.
- Preservation of `city`, `company`, `paid_at`, and expense-level `payment_mode`.
- Whether duplicate `invoice_reference` values should remain separate invoices or be grouped.
- Whether new `vehicle_expense_invoice_item_vehicles` should be populated for every migrated vehicle item or only kept for future multi-vehicle items.

Low confidence / questions before Phase 2D.2:

1. What fallback vendor name should be used for legacy expenses with missing vendors?
2. Should legacy expenses be migrated one-to-one as invoices, or grouped by vendor + invoice reference + date?
3. If a legacy payment covers expenses from multiple vendors, should the new payment batch vendor be `Mixed Vendors`, split into one batch per vendor, or use another convention?
4. Should `city`, `company`, `paid_at`, and legacy expense-level `payment_mode` be appended to invoice remarks, exported separately, or intentionally dropped?
5. Should migrated rows preserve original UUIDs where possible, or use new UUIDs with a crosswalk?
6. How should inconsistent paid/pending/payment-item records be handled: block the migration, create synthetic records, or migrate as-is with exceptions?
7. Should existing new Vendor Invoice data be allowed to coexist with migrated legacy data, and how should duplicate business records be detected?
