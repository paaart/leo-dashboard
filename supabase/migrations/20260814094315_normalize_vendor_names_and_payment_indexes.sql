-- Normalize the vendor typo that prevented a mixed August payment batch from
-- being saved. Payment batches intentionally require an exact vendor match.
update public.vehicle_expense_invoices
set vendor_name = 'Harish Misc',
    updated_at = now()
where vendor_name = 'Harish MIsc';

-- The runtime compatibility fix created this duplicate index while removing
-- an older invoice-only uniqueness constraint. Keep the canonical constraint
-- from 202606300002 and remove the redundant index.
drop index if exists public.vehicle_expense_payment_allocations_batch_invoice_uidx;
