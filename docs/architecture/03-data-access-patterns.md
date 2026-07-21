# Data Access Patterns

> Status: Current. Verified against code 2026-07-21.
> This is the doc that makes the codebase stop feeling inconsistent. There are three
> ways this app reaches Postgres, and each is a deliberate choice.

---

## The three clients

| # | Client | Key | Runs on | Enforces access via | Defined in |
|---|---|---|---|---|---|
| A | Browser Supabase client | anon | the user's browser | **RLS** | `src/lib/supabaseClient.ts` |
| B | Admin Supabase client | service role | our server | nothing — **bypasses RLS** | `src/lib/supabase/admin.ts` |
| C | Raw `pg` Pool | Postgres creds | our server | nothing — full SQL access | `src/lib/db.ts` |
| — | SSR Supabase client | anon + cookies | our server | the logged-in user's session/RLS | `src/lib/supabase/route.ts` |

The SSR client (`createRouteClient`) is a special case: it's used inside Route Handlers
purely to **read the session cookie and identify the user** (login, `getCurrentSupabaseUser`).
It isn't the workhorse for data — B and C are.

---

## Pattern A — Browser talks to Supabase directly

```ts
// src/lib/supabaseClient.ts
export const supabase = createClient(URL, ANON_KEY);

// used from a client component, e.g. Loans:
const { data } = await supabase.from("employee_loans").select("amount,type");
const { data } = await supabase.rpc("get_outstanding_loans");
```

**Who uses it:** Domestic Calculator (`transport_quotes`, `vehicle_quotes`,
`transport_distances` via `src/lib/api.ts`), Loans/Advances (all of it), International
reads, and some Warehouse client modals.

**Security model:** the anon key can only do what **Row-Level Security** allows. So the
safety of every pattern-A table depends on its RLS policies being correct. Those
policies are configured in Supabase and are **not in the migrations folder** — you
can't see them by reading this repo. Treat "is RLS correct on this table?" as an open
question (see [PROJECT_STATE.md](../PROJECT_STATE.md)).

**Use it when:** the read is low-risk (reference data), or the whole module is already
admin-gated and you want to ship a screen without writing a route. Prefer a route the
moment you're writing money or sensitive data.

---

## Pattern B — Route Handler with the admin (service-role) client

```ts
// src/lib/supabase/admin.ts
export function createAdminClient() {
  return createClient(URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

**Who uses it:** auth (`login`, `request-access` lookups and user creation), user
management (`/api/admin/users`), and CRUD that must ignore RLS or use admin auth APIs
(`admin.auth.admin.createUser`, `deleteUser`).

**Security model:** the service role **bypasses RLS entirely**. That's the point — but
it means the Route Handler is the *only* thing standing between a caller and the whole
table. So these routes must call `requireAuth`/`requireAdmin` first, and must scope
their queries themselves.

**Use it when:** the browser can't be trusted to enforce the rule (checking status at
login, approving accounts), or you need Supabase admin APIs.

---

## Pattern C — Route Handler with the raw `pg` Pool

```ts
// src/lib/db.ts
export const db = new Pool({ connectionString: SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });

// used for real transactions:
const client = await db.connect();
try {
  await client.query("begin");
  // insert charge, advance next_charge_date, ...
  await client.query("commit");
} finally {
  client.release();
}
```

The pool is stashed on `global.__pgPool` in dev to survive hot reloads.

**Who uses it:** the **entire warehouse module** (`src/lib/warehouse/*` + the warehouse
routes). Anything that needs multiple statements to succeed or fail together.

**Security model:** full database access. Same rule as pattern B — the route must guard
itself (`requireAdmin` for warehouse) and scope its SQL.

**Use it when:** you touch money, or you need `BEGIN/COMMIT`, or you're writing SQL the
Supabase JS query builder can't express. This is the correct home for financial writes.

---

## Choosing, in practice

```
Are you writing money or need a transaction?         → Pattern C (pg)
Do you need to bypass RLS / use admin auth APIs?      → Pattern B (admin client)
Low-risk read inside an already-gated admin module?   → Pattern A is acceptable
Anything a logged-out visitor should reach?           → a /public route, guard-free by design
```

**The migration hazard:** moving a read from "via a route" to "via the browser" silently
promotes RLS to your security boundary. Moving a write from Supabase-JS to `pg` is the
right call for money but you now own transaction correctness. Neither is free — decide
on purpose.
