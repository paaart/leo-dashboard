# Dashboard Shell and Routing

> Status: Current. Verified against code 2026-07-26.
> Files: `src/app/dashboard/layout.tsx`, `src/app/dashboard/[module]/page.tsx`,
> `src/components/Dashboard/DashboardShell.tsx`, `src/components/Dashboard/HomeContent.tsx`,
> `src/components/Sidebar.tsx`.

The thing to understand: **the dashboard is one client-rendered shell, not a set of
server routes** — with one deliberate exception, Home, which is server-rendered.
Once you see that, the "empty" page files make sense.

---

## 1. What `[module]/page.tsx` renders (mostly nothing — except Home)

```tsx
// src/app/dashboard/[module]/page.tsx  (server component; force-dynamic)
const modules = ["home","domestic","international","fuel-tracker","warehouse","loans","users"];
export default async function DashboardModulePage({ params }) {
  const { module } = await params;
  if (!modules.includes(module)) notFound();

  if (module === "home") {
    const user = await getServerComponentAppUser();   // RSC auth (see arch/02)
    if (!user) redirect("/login");
    return <HomeContent user={user} />;               // ← data fetched server-side
  }

  return null;   // ← client-shell modules render nothing on purpose
}
```

For the six interactive modules its jobs are: **validate the slug** (404 on unknown
modules) and **exist as a URL** so deep links and back/forward work — the UI comes
from the shell. For **`home`** it renders `HomeContent`, an async server component
that queries the DB during the request (renewal alerts, warehouse summary, payment
alerts, loans outstanding — in parallel), so the landing page's data arrives in the
HTML with no client fetches. See [frontend/08](../frontend/08-home.md).

---

## 2. The layout mounts the shell for every dashboard URL

```tsx
// src/app/dashboard/layout.tsx
<DashboardAuthProvider>
  <DashboardShell>{children}</DashboardShell>   {/* children = the page payload */}
</DashboardAuthProvider>
```

So `/dashboard`, `/dashboard/warehouse`, `/dashboard/loans` all render the **same**
`DashboardShell`. The page's payload flows in as `children`: `null` for client-shell
modules, the server-rendered Home for `/dashboard/home` — the shell places it inside
its `<main>` when the section is `home`.

---

## 3. How the shell picks what to show

`DashboardShell` reads the active module from the URL segment
(`useSelectedLayoutSegment()`) and keeps a `Section` in React state:

```ts
type Section =
  | { main: "home" }
  | { main: "domestic" }
  | { main: "fuel" }
  | { main: "international"; sub: "calculator" | "history" }
  | { main: "loans";        sub: "create" | "view" | "employees" }
  | { main: "users" }
  | { main: "warehouse";    sub: "add" | "active" | "renewals" | "payments" | "closed" | "payment-alerts" };
```

- `main` maps to the URL (`/dashboard/<module>`). Changing modules changes the URL.
- `sub` is the screen **within** a module (e.g. warehouse "payments" vs "closed").
  **`sub` is React state only — it is not in the URL.** Clicking "Payments" in the
  warehouse submenu swaps the rendered component without navigating.

`renderContent()` is a big switch on `(main, sub)` that returns the right module
component (`<WarehousePayments/>`, `<LoanEntryForm/>`, etc.). The `home` case returns
`children` — the server-rendered payload from the page (§1, §2).

**Modules are lazy-loaded.** Every module component in the shell is imported via
`next/dynamic` with the `ContentLoadingState` skeleton as its loading fallback, so a
page only downloads the JS for the module it renders (first-load JS for
`/dashboard/[module]` is ~106 kB instead of the whole app). Static imports here would
silently re-bundle everything — don't add one.

**Consequence:** you can deep-link to a module (`/dashboard/warehouse`) but not to a
sub-section. Refreshing on warehouse always lands on the default sub (`active`).

---

## 4. Admin gating lives here too

Two guards, both in `DashboardShell`:

```ts
function isAdminSection(s) {
  return s.main === "warehouse" || s.main === "loans" || s.main === "users";
}
```

- `setAllowedSection` refuses to switch a non-admin into an admin section (it snaps back
  to the current module).
- `renderContent` renders an "Access denied" card if a non-admin somehow lands on an
  admin section.

`Sidebar` also simply **doesn't render** the Warehouse / Loans / User Management links
for non-admins.

Remember: this is UX. The actual security is the server-side guard on the admin APIs
(and RLS for Loans). See [02-auth-and-access-control.md](02-auth-and-access-control.md).

---

## 5. Navigation model

- **`Sidebar`** (`src/components/Sidebar.tsx`) renders the module links. Modules with
  sub-sections (International, Warehouse, Loans) expand an accordion of buttons that call
  `setSection(...)` to swap `sub` in state. Top-level links are real `<Link>`s that
  change the URL segment (and therefore `main`).
- **`Header`** provides the mobile menu toggle and shows the current user.
- Loading between sections uses `useTransition` + a skeleton (`ContentLoadingState`).

## 6. Routes that ARE real pages (not shell sections)

Not everything is in the shell:

| Route | What it is |
|---|---|
| `/login` | login + request-access (public) |
| `/driver/fuel-entry` | public driver fuel submission (public) |
| `/warehouse/statement` | standalone warehouse statement page (its own route, outside the shell) |
| `/dashboard/home` | server-rendered Home inside the shell chrome (§1) |
| `/` and `/dashboard` | redirect → `/dashboard/home` (login lands there too) |

---

## 7. If you're adding a screen

- **New sub-section of an existing module:** add a value to that module's `sub` union,
  a `Sidebar` button that sets it, and a branch in `renderContent()`. No new route file.
- **New top-level module:** add the slug to the `modules` arrays (in both
  `[module]/page.tsx` and `DashboardShell`), extend the `Section`/`DashboardModule`
  unions, add a `Sidebar` link, and a `renderContent()` branch whose component is
  imported via `next/dynamic` (match the existing pattern — a static import re-bundles
  every page). If it's admin-only, add it to `isAdminSection`.
- **New server-rendered view (like Home):** render it from `[module]/page.tsx`, pass
  it through as the shell's `children`, and add a `renderContent()` case returning
  `children`. Auth comes from `getServerComponentAppUser()`; data comes from the
  server-side lib functions ([architecture/03](03-data-access-patterns.md)).
- **Standalone page (outside the shell):** create a normal route under `src/app/` (like
  `/warehouse/statement`). It won't get the shell chrome.
