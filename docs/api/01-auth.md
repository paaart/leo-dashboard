# API — Auth

> Status: Current. Verified 2026-07-21.
> Routes: `src/app/api/auth/{login,logout,me,request-access}/route.ts`.
> Concepts and the profiles model: [architecture/02](../architecture/02-auth-and-access-control.md).

All four are **public** (no `requireAuth`) — they're the endpoints you hit *before* you
have a session. Data access uses the SSR client (session cookies) and the admin client
(service role) from `src/lib/supabase/*`.

---

## POST `/api/auth/login`

Username + password login. Maps username → profile → Supabase email sign-in.

**Body:** `{ username | identifier, password }` (username is lowercased/trimmed).

**Flow & errors:**

| Situation | Status | `error` |
|---|---|---|
| missing username/password | 400 | "Missing username or password" |
| no matching profile / bad password | 401 | "Invalid username or password" |
| profile `status !== 'active'` | 403 | "Account is not active. Please contact admin." |
| Supabase user id ≠ profile.auth_user_id | 403 | "Account profile mismatch" |
| success | 200 | — |

**Success:** `{ ok: true, user: { id, email, username, fullName, role, status } }`, with
Supabase session cookies attached to the response.

**Touches:** `profiles` (read via admin client), Supabase Auth (`signInWithPassword`).

---

## POST `/api/auth/request-access`

Self-service signup. Creates a Supabase auth user + a `pending` profile for admin
approval. `runtime = "nodejs"`.

**Body:** `{ fullName, username, email, phone, password }`.

**Validation:** username `^[a-z0-9_-]+$`, ≥3 chars, unique (409 if taken); email format +
unique (409 if registered); phone ≥10 digits; all fields required (400 otherwise).

**Flow:** `admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata })`
→ insert `profiles` row `{ role: 'user', status: 'pending' }`. If the profile insert
fails, the auth user is deleted (rollback).

**Success:** `{ ok: true, message: "Account request submitted. Please wait for admin approval." }`.

**Touches:** Supabase Auth (admin create/delete), `profiles` (insert).

> The new account **cannot log in** until an admin sets `status = 'active'` via
> [api/02](02-admin-users.md).

---

## GET `/api/auth/me`

Returns the current active app user. Used by `DashboardAuthProvider` on mount.

- `getCurrentAppUser(request)` → the session's `profiles` row **if `status = 'active'`**.
- **200** `{ ok: true, user: { id, email, username, fullName, role, status } }`
- **401** `{ ok: false, error: "Session expired" }` if no session or not active.
- **500** on unexpected error.

**Touches:** Supabase Auth (`getUser`), `profiles` (read).

---

## POST `/api/auth/logout`

`supabase.auth.signOut()` on the SSR client and returns `{ ok: true }` with cleared
session cookies. No body.
