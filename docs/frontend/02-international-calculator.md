# Frontend — International Calculator

> Status: Current. Verified 2026-07-21.
> Component: `src/components/InternationalCalculator/`.
> Access: all users. Data: `/api/international/*` ([api/03](../api/03-international-calculator.md)).
> Two shell sub-sections: `calculator` and `history`.

Builds international shipping quotes, generates a PDF quote document, and saves/lists
past quotes.

---

## Calculator (`sub: "calculator"` → `InternationalShipping.tsx`)

The wrapper holds a `BasicDetails` form and orchestrates the sections:

| File | Role |
|---|---|
| `Calculator/ClientInfoSection.tsx` | customer, origin/destination city/port/country, mode, CBM |
| `Calculator/ChargesSection.tsx` | packing, handling, origin custom, ocean freight, DTHC, destination charges |
| `Calculator/ResultsTable.tsx` | computed breakdown (uses `helpers.ts`) |
| `Calculator/SubmitActions.tsx` | save + download actions |
| `Calculator/DownloadDocument.tsx` | `downloadPDF` — renders the PDF |
| `helpers.ts` | `computeDerivedValues`, `margins`, `generateTableData`, `generatePartFData`, `generateTotalRow`, `isDataComplete` |
| `types.ts` | `BasicDetails`, `QuoteRow` shapes |
| `PdfDocument.tsx` | the `@react-pdf/renderer` document template |

**Compute:** all figures (margins, GST, totals) are derived client-side in `helpers.ts`
from the entered charges. `calculateGSTVal` toggles whether GST is applied.

**Save:** `saveInternationalQuote(values)` (in `src/lib/api.ts`) → `POST
/api/international/save`. Success/error surface via `react-hot-toast`.

**Download:** `downloadPDF` renders `PdfDocument` and saves it (via `file-saver`).

---

## History (`sub: "history"` → `History/HistoryList.tsx`)

Lists saved quotes and lets you preview/re-download their PDFs.

| File | Role |
|---|---|
| `History/HistoryList.tsx` | fetches + lists past quotes |
| `History/HistoryItem.tsx` | one quote row |
| `History/PdfPreviewModal.tsx` | preview a quote's PDF (uses `react-pdf`) |

**Fetch:** `fetchInternationalQuote()` (in `src/lib/api.ts`) → `GET
/api/international/history`, mapped from snake_case rows to `BasicDetails[]`.

---

## Notes

- The `/api/international/*` routes use the older `{ data } / { success, data } / { error }`
  response shape; `src/lib/api.ts` normalises it, so components see clean data or a thrown
  error.
- `international_quotes` is a **Supabase-only** table (not in migrations).
