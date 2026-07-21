# Auth and Access Control

> Status: Current. Verified against code 2026-07-21.
> Files: `src/middleware.ts`, `src/lib/auth.ts`, `src/lib/auth-routes.ts`,
> `src/lib/supabase/*`, `src/app/api/auth/*`, `src/components/Dashboard/DashboardAuthProvider.tsx`.

---

## 1. The model in one picture

```
Supabase Auth (auth.users)      ← email + password, cookie session
        │  auth_user_id
        ▼
public.profiles                 ← the APP user: username, role, status
        │
        ├── role:   'user' | 'admin'
        └── status: 'pending' | 'active' | 'inactive' | 'rejected'
```

A person can only *use* the app when they have both a Supabase auth user **and** a
`profiles` row with `status = 'active'`. The `profiles` table is the bridge: it adds a
username, a role, and an approval status on top of Supabase's email identity.

---

## 2. Two enforcement points

### Page routes — `src/middleware.ts`

Runs on every request except `/_next/static`, `/_next/image`, `favicon.ico` (matcher),
and additionally passes through:

- anything starting with `/_next` or `/api`
- anything containing a `.` (static files)
- public routes from `isPublicRoute()`: `/login`, `/driver/fuel-entry`,
  `/api/vehicles/public`, `/api/fuel-entries/public`

For everything else it reads the Supabase session from cookies. **No session →
redirect to `/login?next=<path>`.** That's all it checks — it does **not** verify role
or status. Middleware is a coarse "are you logged in at all" gate for pages.

### API routes — self-guarding

Middleware skips `/api` entirely, so **each route handler enforces its own auth** using
helpers from `src/lib/auth.ts`:

```ts
const auth = await requireAuth(request);   // 401 "Session expired" if not an active app user
if (!auth.ok) return auth.response;
const user = auth.user;                     // { id, email, username, role, ... }
```

```ts
const auth = await requireAdmin(request);  // requireAuth + 403 "Forbidden" if role !== 'admin'
if (!auth.ok) return auth.response;
```

Both resolve the current user via `getCurrentAppUser(request)`:

1. `getCurrentSupabaseUser` — reads the session cookie via the SSR client
   (`createRouteClient`) and calls `supabase.auth.getUser()`.
2. Looks up the matching `profiles` row (by `auth_user_id`) using the **admin client**
   (service role).
3. Returns the user **only if `status === 'active'`**. Pending/inactive/rejected → treated
   as no user.

> A route that calls neither guard is public. If you add a route and forget the guard,
> you've shipped an open endpoint.

---

## 3. Login flow (`POST /api/auth/login`)

Username-first, because operational users think in usernames but Supabase authenticates
by email.

```
body: { username, password }   (also accepts { identifier })
  → normalise username to lowercase
  → admin client: find profiles row where username matches
  → no profile?                → 401 "Invalid username or password"
  → profile.status !== active  → 403 "Account is not active. Please contact admin."
  → supabase.auth.signInWithPassword({ email: profile.email, password })
       → error                 → 401 "Invalid username or password"
  → cross-check data.user.id === profile.auth_user_id (else 403 "Account profile mismatch")
  → 200 { ok: true, user: { id, email, username, fullName, role, status } }
       + session cookies attached to the response
```

The handler is careful to copy the Supabase auth cookies onto the JSON response
(`jsonWithAuthCookies`) so the browser is actually signed in.

## 4. Signup / request access (`POST /api/auth/request-access`)

Self-service. Validates full name, username (`^[a-z0-9_-]+$`, ≥3 chars, unique), email
(unique, format-checked), phone (≥10 digits), password. Then:

```
admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata })
  → insert profiles row { auth_user_id, username, email, phone, role: 'user', status: 'pending' }
  → if the profile insert fails, the auth user is rolled back (deleteUser)
```

Result: a `pending` account that **cannot log in** until an admin flips it to `active`
(see [api/02-admin-users.md](../api/02-admin-users.md)).

## 5. Other auth routes

| Route | Method | Does |
|---|---|---|
| `/api/auth/me` | GET | returns the current active app user, or 401 |
| `/api/auth/logout` | POST | `supabase.auth.signOut()`, clears the session cookie |

## 6. Client side — `DashboardAuthProvider`

A React context (`useDashboardAuth`) that:

- reads a cached user from `localStorage` (`leo-dashboard-auth-user`) for an instant
  first paint,
- then calls `GET /api/auth/me` to confirm; on failure it clears the cache and
  `router.replace("/login")`,
- exposes `{ user, loading, ready, refreshUser }`.

`DashboardShell` uses this to decide what to render and whether to allow admin sections.

## 7. Roles and access matrix

| Section | `user` | `admin` |
|---|:--:|:--:|
| Domestic Calculator | ✅ | ✅ |
| International Calculator | ✅ | ✅ |
| Vehicle Tracker | ✅ | ✅ |
| Warehouse | ❌ | ✅ |
| Loans / Advances | ❌ | ✅ |
| User Management | ❌ | ✅ |

Admin-only sections are enforced **both** client-side (hidden in `Sidebar`, blocked in
`DashboardShell.setAllowedSection` / `renderContent`) and server-side. The server guard
is the real boundary; see [DECISIONS.md](../DECISIONS.md) §7.

- **Warehouse & user-management APIs** call `requireAdmin` in their route handlers.
- **Loans/Advances has no API routes** — it reads/writes Supabase directly from the
  browser using the anon key, so its protection is (a) the client gating in the shell
  and (b) whatever **RLS** policies exist on `employees` / `employee_loans`. RLS
  correctness here is **unverified** and worth auditing (see
  [PROJECT_STATE.md](../PROJECT_STATE.md)).

## 8. Public (unauthenticated) surface

Deliberately open, for drivers who won't have accounts:

- Page: `/driver/fuel-entry`
- APIs: `/api/vehicles/public` (list vehicles to pick from), `/api/fuel-entries/public`
  (submit a fuel entry)

These must never expose admin data or accept privileged writes. See
[api/04-fuel-and-vehicles.md](../api/04-fuel-and-vehicles.md).
