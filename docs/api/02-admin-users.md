# API — Admin / User Management

> Status: Current. Verified 2026-07-21.
> Routes: `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`.
> Both are **admin-only** (`requireAdmin`), `runtime = "nodejs"`, and use the
> service-role client. Frontend: [frontend/06](../frontend/06-user-management.md).

This is how admins approve access requests (`pending` → `active`) and manage roles.

---

## GET `/api/admin/users`

List all profiles, newest first. Optional `?status=` filter
(`pending` | `active` | `inactive` | `rejected`) — used to show the approval queue.

**Success:** `{ ok: true, data: Profile[] }` where each row is
`{ id, auth_user_id, full_name, username, email, phone, role, status, created_at, updated_at }`.

**Errors:** 500 `"Could not load users"`.

**Touches:** `profiles` (read).

---

## PATCH `/api/admin/users/[id]`

Update a user's `role` and/or `status`. `id` is the `profiles.id`.

**Body:** `{ role?, status? }` — at least one required.

| Field | Allowed values |
|---|---|
| `role` | `user` \| `admin` |
| `status` | `pending` \| `active` \| `inactive` \| `rejected` |

**Errors:**

| Situation | Status | `error` |
|---|---|---|
| bad JSON | 400 | "Invalid request body" |
| invalid role | 400 | "Invalid role" |
| invalid status | 400 | "Invalid status" |
| neither field given | 400 | "No updates provided" |
| row not found | 404 | "Could not update user" |
| db error | 500 | "Could not update user" |

**Success:** `{ ok: true, data: Profile }` (the updated row).

**Touches:** `profiles` (update).

> **Approval flow:** a signup lands as `pending`. An admin PATCHes it to `active` to
> grant access, `rejected`/`inactive` to deny or suspend. Only `active` users pass
> `getCurrentAppUser`, so flipping status is what actually turns access on or off.
>
> This route only edits the `profiles` row — it does **not** touch Supabase Auth. There
> is no delete-user endpoint; suspension is done via `status`.
