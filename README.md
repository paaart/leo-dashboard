This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# Warehouse Management & Billing System

This module manages warehouse storage clients, monthly billing, insurance, payments, renewals, and ledger tracking.

The system is designed to be **time-driven, audit-safe, and transparent**, avoiding forecasts or assumptions.

---

## Core Concepts

### 1. Warehouse Pod
Represents one warehouse client and their storage agreement.

Stored in:
- `warehouse_pods`

Contains:
- Client details
- Start date & duration
- Monthly rate
- Insurance configuration
- Billing schedule
- Status (active / closed)

---

### 2. Billing Cycle
Each storage period (including renewals) is represented as a **cycle**.

Stored in:
- `warehouse_pod_cycles`

Each cycle records:
- Cycle start & end date
- Duration (months)
- Rate at the time of cycle start
- Insurance provider & value at start
- Status (active / closed)

Cycles are **immutable once closed**.

---

### 3. Ledger / Transactions
All money movement is recorded as ledger entries.

Stored in:
- `warehouse_pod_transactions`

This table is the **single source of truth** for balances.

---

## Transaction Types

### Charge (Debit)
Money the client owes.

Examples:
- Monthly storage charge
- Monthly insurance charge
- One-time service charges

Rules:
- Stored as **positive amount**
- GST applicable
- Amount + GST = Debit Total

---

### Payment (Credit)
Money received from the client.

Examples:
- Cash
- UPI
- Bank transfer

Rules:
- Stored as **negative amount**
- No GST
- Immediately reduces outstanding

---

### Adjustment
Manual correction entry.

Examples:
- Discounts
- Error corrections
- Waivers

Rules:
- Can be positive or negative
- Does not affect billing schedule

---

## Automatic Charge Accrual

Triggered by:
```ts
accrueWarehouseCharges(podId?)

# Warehouse Management & Billing System

This module manages warehouse storage clients, monthly billing, insurance, payments, renewals, and ledger tracking.

The system is **ledger-first, time-driven, and audit-safe**.
There are no forecasts, no retroactive billing, and no hidden calculations.

---

## Core Tables

### warehouse_pods
Represents a warehouse storage client.

Key fields:
- start_date
- duration_months
- rate
- insurance_provider
- insurance_value
- next_charge_date
- next_payment_date
- status

This table holds the **current configuration only**.

---

### warehouse_pod_cycles
Represents immutable billing periods (including renewals).

Each cycle stores:
- cycle_start
- cycle_end
- duration_months
- rate_at_start
- billing_interval_at_start
- insurance_provider_at_start
- insurance_value_at_start
- status (active / closed)

Every renewal creates a **new cycle**.

---

### warehouse_pod_transactions
The financial ledger (single source of truth).

Stores:
- charges (debit)
- payments (credit)
- adjustments

All balances are derived from this table only.

---

## Transaction Types

| Type        | Amount Sign | GST | Description |
|------------|-------------|-----|-------------|
| charge     | +positive   | Yes | Storage, insurance, services |
| payment    | -negative   | No  | Money received |
| adjustment | ±           | Optional | Manual correction |

---

## SQL Functions (Complete Map)

### 🔹 warehouse_active_cycle_id(pod_id uuid)
Returns the currently active cycle ID for a pod.

Used by:
- Charge accrual
- Transaction insertion

---

### 🔹 warehouse_get_or_create_active_cycle(pod_id uuid)
Creates a new active cycle **only if none exists**.

Used by:
- Charge accrual safety
- System bootstrapping

---

### 🔹 warehouse_accrue_charges(p_pod_id uuid default null)
**Core billing engine**

Behavior:
1. Loops over active pods
2. Fetches active cycle
3. Checks `next_charge_date`
4. Inserts monthly charge if due
5. Prevents duplicate charges per month
6. Advances `next_charge_date`

Inserts into:
- `warehouse_pod_transactions`

Triggered from:
```ts
accrueWarehouseCharges(podId?)
