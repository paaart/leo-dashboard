# Migrations & Schema Drift

> Status: Current. Verified 2026-07-21.
> Read this before assuming `supabase/migrations/` is the whole database. It isn't.

---

## The workflow (intended)

Schema changes are meant to be versioned SQL applied via the Supabase CLI, committed
with the code that needs them. Scripts (from `package.json`):

```bash
npm run db:start    # start the local Supabase stack
npm run db:reset    # recreate local DB + apply ALL migrations
npm run db:migrate  # apply pending migrations locally
npm run db:diff     # generate a schema diff into a new migration (uses migra)
npm run db:push     # push local migrations to the linked remote project
npm run db:stop     # stop the local stack
```

Link the repo to the project once with `supabase link --project-ref <ref>`.

`.gitignore` keeps local Supabase state out of git but **commits** `supabase/config.toml`
and everything under `supabase/migrations/`.

---

## The drift — what's actually versioned vs not

This is the important part. Only **some** of the live schema is in
`supabase/migrations/`:

**In migrations (reproducible by `db:reset`):**

- `vehicles`, `fuel_entries` (+ driver columns, optionality changes, company snapshot)
- `profiles` (+ username, account-request status, phone)
- `vehicle_expenses`, `vehicle_expense_payments`, `vehicle_expense_payment_items` (legacy)
- `vehicle_expense_invoices` + items + item-vehicles + payments + payment batches +
  allocations, and all their trigger/function machinery
- the legacy→vendor-invoice data migration (`202607010001`)
- a money-precision fix (`202607180001`)
- `warehouse_payment_alert_dismissals` (`202607210001`)
- vehicle renewal dates and alert dismissals (`20260722114426`)
- vehicle renewal amount/vendor invoice prefill fields (`20260722115635`)
- calculator lookup tables (`transport_quotes`, `vehicle_quotes`,
  `transport_distances`, `international_quotes`) and their seed data

**NOT in migrations (created directly in Supabase — invisible to `db:reset`):**

- **Warehouse core:** `warehouse_pods`, `warehouse_pod_cycles`,
  `warehouse_pod_transactions`, `warehouse_client_id_seq`, and the warehouse enum types
  (`warehouse_billing_interval`, `warehouse_insurance_provider`, `warehouse_pod_status`,
  `warehouse_tx_type`).
- **Loans:** `employees`, `employee_loans`, `companies`, `locations`, and the
  `get_outstanding_loans()` RPC.
- **RLS policies** for every table (none of the policies are in the repo).

### Consequences

1. **A fresh `supabase db reset` still does NOT give you a fully working database.**
   The warehouse module will fail immediately (missing tables + enum types), and so will
   loans. The domestic and international calculator lookup tables are now versioned, so
   those specific tables do come back from migrations.
2. **You can't review RLS by reading the repo.** Anything using the browser Supabase
   client (Domestic, Loans, International reads, parts of Warehouse UI) depends on RLS
   that lives only in the Supabase dashboard. See
   [architecture/03-data-access-patterns.md](../architecture/03-data-access-patterns.md).
3. The safest way to reproduce the real schema today is a `supabase db pull` / `db dump`
   against the live project — not the migrations folder.

### If you're fixing the drift

The clean path is to `supabase db pull` a baseline migration from the live project so
the missing tables, enums, functions, and policies become versioned, then register it as
already-applied. Until that's done, treat the migrations folder as **partial** and
[database/01-schema-overview.md](01-schema-overview.md) (built from code) as the more
complete map.

---

## Adding a new migration (once you're working within the CLI flow)

```bash
supabase migration new <descriptive_name>   # creates a timestamped .sql file
# write the SQL
npm run db:reset                            # verify it applies cleanly locally
npm run db:push                             # apply to the linked remote project
git add supabase/migrations/<file> && commit with the code that needs it
```

Follow the existing conventions in the folder: `create table if not exists`, named
`check` constraints, explicit indexes, and — for money invariants — deferred constraint
triggers like the vendor-invoice tables use.
