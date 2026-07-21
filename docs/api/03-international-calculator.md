# API — International Calculator

> Status: Current. Verified 2026-07-21.
> Routes: `src/app/api/international/{save,history}/route.ts`.
> Both require `requireAuth`. Frontend: [frontend/02](../frontend/02-international-calculator.md).

These two routes persist and list saved international shipping quotes. **Note the
response shapes differ from the rest of the API** — they predate the `{ ok, data }`
convention (see [api/00](00-api-overview.md) §2). The client normalises them in
`src/lib/api.ts`.

Both use the **browser Supabase client** (`supabaseClient`) even though they run
server-side — an older pattern; the table `international_quotes` is reached with the
anon key here.

---

## POST `/api/international/save`

Saves a quote. The body uses camelCase; the handler maps it to snake_case columns.

**Body → column mapping:**

| Body field | Column |
|---|---|
| `customerName` | `customer_name` |
| `originCity` / `originPort` | `origin_city` / `origin_port` |
| `destinationCity` / `destinationCountry` / `destinationPort` | `destination_city` / `destination_country` / `destination_port` |
| `mode` | `mode` |
| `volumeInCBM` | `volume_cbm` |
| `packingCharges`, `handlingCharges`, `originChargesCustom`, `oceanFreight`, `dthc`, `destination` | `packing_charges`, `handling_charges`, `origin_charges_custom`, `ocean_freight`, `dthc`, `destination_charges` (parsed via `parseFloat`, default `0`) |
| `calculateGSTVal` | `calculate_gst_val` |

**Success:** `{ success: true, data: [insertedRow] }`.
**Error:** `{ error: message }` with status 500.

**Touches:** `international_quotes` (insert).

---

## GET `/api/international/history`

Lists saved quotes, newest first, and maps snake_case rows back to the camelCase
`BasicDetails` shape the UI uses (numeric charge fields are stringified).

**Success:** `{ data: BasicDetails[] }`.
**Error:** `{ error: message }` with status 500.

**Touches:** `international_quotes` (read).

> The domestic calculator has **no API routes** — it reads `transport_quotes`,
> `vehicle_quotes`, and `transport_distances` directly from the browser via
> `src/lib/api.ts`. See [frontend/01](../frontend/01-domestic-calculator.md).
