# Frontend — User Management

> Status: Current. Verified 2026-07-21.
> Component: `src/components/UserManagement/UserManagement.tsx`.
> Access: **admin only**. Data: `/api/admin/users` ([api/02](../api/02-admin-users.md)).
> Shell section: `users`.

Where admins approve access requests and manage roles/status. It's the human side of the
[auth model](../architecture/02-auth-and-access-control.md).

---

## What it does

- Lists profiles from `GET /api/admin/users` (optionally filtered by `?status`, to show
  the `pending` approval queue).
- For each user, an admin can change **role** (`user` ↔ `admin`) and **status**
  (`pending` / `active` / `inactive` / `rejected`) via `PATCH /api/admin/users/[id]`.

The core action is approving a signup: a `request-access` submission arrives as
`pending`; setting it to `active` is what actually lets that person log in (login and
`getCurrentAppUser` both require `status = 'active'`).

---

## Notes

- Both endpoints are `requireAdmin`, so the whole screen is server-gated in addition to
  being hidden from non-admins in the sidebar.
- There is **no delete-user** action — suspension is done by setting `status` to
  `inactive`/`rejected`. The route touches only the `profiles` row, not Supabase Auth.
- Uses the shared `PageHeader` / `SectionCard` primitives and `react-hot-toast` for
  feedback, like the rest of the dashboard.
