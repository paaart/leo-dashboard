# Frontend — Loans & Advances

> Status: Current. Verified 2026-07-21.
> Component: `src/components/LoansAndAdvances/`.
> Access: **admin only**. Data: **browser → Supabase** directly (no API routes).
> Three shell sub-sections: `create`, `view`, `employees`.

A mini ledger for money given to employees — loans, advances, and repayments. Balances
are derived from transaction history, never stored.

---

## The three screens

| Section | Component | Purpose |
|---|---|---|
| `create` | `LoanEntryForm.tsx` | record a loan / advance / repayment |
| `view` | `OutstandingLoansList.tsx` | outstanding balance per employee + drill-in |
| `employees` | `ManageEmployees.tsx` | add/edit employees (with company/location) |

Supporting: `LoanSummaryCards.tsx` (totals) and `EmployeeHistoryView.tsx` (one
employee's full transaction history). Employee selection uses the shared
`EmployeeSearchSelect` (`src/lib/EmployeeSearchSelect.tsx`).

---

## Data model & the sign convention

All reads/writes go straight to Supabase with the browser client (`supabaseClient`):

- **`employees`** — `id`, `name`, `employee_code`, `display` (soft-hide), company/location.
  `LoanEntryForm` loads `where display = true`.
- **`employee_loans`** — the ledger. On submit, `LoanEntryForm` inserts
  `{ employee_id, amount, type, remarks, payment_date }` where:

  ```
  type = "loan" | "advance"   → amount stored POSITIVE
  type = "repayment"          → amount stored NEGATIVE (−amount)
  ```

  So an employee's outstanding balance is just the **sum of their `employee_loans.amount`**.

- **`get_outstanding_loans()`** — a Supabase RPC used by `LoanSummaryCards` and
  `OutstandingLoansList` to fetch per-employee outstanding totals without summing
  client-side.

---

## Notes

- Because this module talks to Supabase directly with the anon key, its data safety
  depends on **RLS** on `employees` / `employee_loans` (plus the admin-only client gating
  in the shell). RLS correctness here is unverified — see
  [PROJECT_STATE.md](../PROJECT_STATE.md) and
  [architecture/03](../architecture/03-data-access-patterns.md).
- `employees`, `employee_loans`, `companies`, `locations`, and the RPC are all
  **Supabase-only** (not in migrations).
- Repayments intentionally reuse the negative-amount behaviour rather than a separate
  table — the form text even says so.
