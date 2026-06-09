"use client";

import { displayTransactionTitle } from "@/lib/utils";
import {
  round2,
  fmtINR,
  monthLabel,
  clampNumberString,
  clampSignedNumberString,
  computeMonthTotals,
  type LedgerTxVM,
} from "@/lib/warehouse/ledgerMath";
import { EmptyState } from "@/components/shared/DashboardUI";

type EditDraft = {
  amount: string;
  gst_rate: string;
  title: string;
  note: string;
  tx_date: string;
};

export default function WarehouseCurrentLedgerTable({
  months,
  drafts,
  cellInput,
  savingId,
  deletingTxId,
  updateDraft,
  onSaveRow,
  onDeleteRow,
}: {
  months: Array<{ monthKey: string; rows: LedgerTxVM[] }>;
  drafts: Record<string, EditDraft>;
  cellInput: string;
  savingId: string | null;
  updateDraft: (id: string, patch: Partial<EditDraft>) => void;
  onSaveRow: (row: LedgerTxVM) => Promise<void>;
  deletingTxId: string | null;
  onDeleteRow: (row: LedgerTxVM) => Promise<void> | void;
}) {
  if (months.length === 0) {
    return (
      <EmptyState
        title="No ledger entries"
        description="Charges, payments, and adjustments for this cycle will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {months.map((m) => {
        const monthTotals = computeMonthTotals(m.rows);

        return (
          <section
            key={m.monthKey}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <div className="font-semibold text-gray-900 dark:text-white">
                {monthLabel(m.monthKey)}
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                  Debit: {fmtINR(monthTotals.debit)}
                </span>
                <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
                  Credit: {fmtINR(monthTotals.credit)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    monthTotals.net > 0
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                      : "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300"
                  }`}
                >
                  Net: {fmtINR(monthTotals.net)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  <tr>
                    <th className="w-36 border-b border-gray-200 px-3 py-3 text-left font-semibold dark:border-gray-800">
                      Date
                    </th>
                    <th className="border-b border-gray-200 px-3 py-3 text-left font-semibold dark:border-gray-800">
                      Type
                    </th>
                    <th className="border-b border-gray-200 px-3 py-3 text-left font-semibold dark:border-gray-800">
                      Remarks
                    </th>
                    <th className="w-32 border-b border-gray-200 px-3 py-3 text-right font-semibold dark:border-gray-800">
                      Amount
                    </th>
                    <th className="w-24 border-b border-gray-200 px-3 py-3 text-right font-semibold dark:border-gray-800">
                      GST
                    </th>
                    <th className="w-32 border-b border-gray-200 px-3 py-3 text-right font-semibold dark:border-gray-800">
                      Balance Impact
                    </th>
                    <th className="w-28 border-b border-gray-200 px-3 py-3 text-right font-semibold dark:border-gray-800">
                      Payment
                    </th>
                    <th className="w-40 border-b border-gray-200 px-3 py-3 text-right font-semibold dark:border-gray-800">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {m.rows.map((r) => {
                    const d = drafts[r.id];
                    if (!d) return null;

                    const amountAbs = Number(d.amount || 0);
                    const gstRate = r._isDebit ? Number(d.gst_rate || 0) : 0;
                    const gstAmt = r._isDebit
                      ? round2(amountAbs * (gstRate / 100))
                      : 0;
                    const debitTotal = r._isDebit
                      ? round2(amountAbs + gstAmt)
                      : 0;
                    const creditAmt = r._isDebit ? 0 : round2(amountAbs);
                    const isSaving = savingId === r.id;

                    return (
                      <tr
                        key={r.id}
                        className="bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                      >
                        <td className="px-3 py-2">
                          <input
                            className={cellInput}
                            type="date"
                            value={d.tx_date}
                            onChange={(e) =>
                              updateDraft(r.id, { tx_date: e.target.value })
                            }
                          />
                        </td>

                        <td className="min-w-52 px-3 py-2">
                          <input
                            className={cellInput}
                            value={displayTransactionTitle(d.title)}
                            onChange={(e) =>
                              updateDraft(r.id, { title: e.target.value })
                            }
                            placeholder="Title"
                          />
                        </td>

                        <td className="min-w-64 px-3 py-2">
                          <input
                            className={cellInput}
                            value={d.note}
                            onChange={(e) =>
                              updateDraft(r.id, { note: e.target.value })
                            }
                            placeholder="Optional note"
                          />
                        </td>

                        <td className="px-3 py-2 text-right">
                          <input
                            className={cellInput}
                            inputMode="decimal"
                            value={d.amount}
                            onChange={(e) =>
                              updateDraft(r.id, {
                                amount: clampSignedNumberString(e.target.value),
                              })
                            }
                          />
                        </td>

                        <td className="px-3 py-2 text-right">
                          <input
                            className={`${cellInput} ${
                              r._isDebit ? "" : "opacity-50"
                            }`}
                            inputMode="decimal"
                            disabled={!r._isDebit}
                            value={r._isDebit ? d.gst_rate : "0"}
                            onChange={(e) =>
                              updateDraft(r.id, {
                                gst_rate: clampNumberString(e.target.value),
                              })
                            }
                          />
                        </td>

                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-blue-700 dark:text-blue-300">
                          {r._isDebit ? debitTotal.toFixed(2) : "—"}
                        </td>

                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-green-700 dark:text-green-300">
                          {!r._isDebit ? creditAmt.toFixed(2) : "—"}
                        </td>

                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => void onSaveRow(r)}
                              disabled={isSaving || deletingTxId === r.id}
                              className="inline-flex min-h-9 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSaving ? "Saving…" : "Save"}
                            </button>

                            <button
                              type="button"
                              onClick={() => void onDeleteRow(r)}
                              disabled={isSaving || deletingTxId === r.id}
                              className="inline-flex min-h-9 items-center justify-center rounded-md border border-red-200 px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                            >
                              {deletingTxId === r.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Debit Total = Amount + GST. Credit has no GST.
            </div>
          </section>
        );
      })}
    </div>
  );
}
