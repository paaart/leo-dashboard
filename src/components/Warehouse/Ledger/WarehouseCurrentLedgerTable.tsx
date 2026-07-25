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
            className="overflow-hidden rounded-xl border border-edge bg-surface shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3">
              <div className="font-semibold text-fg">
                {monthLabel(m.monthKey)}
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-soft-fg">
                  Debit: {fmtINR(monthTotals.debit)}
                </span>
                <span className="rounded-full border border-success/25 bg-success-soft px-2.5 py-1 text-xs font-medium text-success-soft-fg">
                  Credit: {fmtINR(monthTotals.credit)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    monthTotals.net > 0
                      ? "border-danger/25 bg-danger-soft text-danger-soft-fg"
                      : "border-success/25 bg-success-soft text-success-soft-fg"
                  }`}
                >
                  Net: {fmtINR(monthTotals.net)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-surface-2 text-fg-muted">
                  <tr>
                    <th className="w-36 border-b border-edge px-3 py-3 text-left font-semibold">
                      Date
                    </th>
                    <th className="border-b border-edge px-3 py-3 text-left font-semibold">
                      Type
                    </th>
                    <th className="border-b border-edge px-3 py-3 text-left font-semibold">
                      Remarks
                    </th>
                    <th className="w-32 border-b border-edge px-3 py-3 text-right font-semibold">
                      Amount
                    </th>
                    <th className="w-24 border-b border-edge px-3 py-3 text-right font-semibold">
                      GST
                    </th>
                    <th className="w-32 border-b border-edge px-3 py-3 text-right font-semibold">
                      Balance Impact
                    </th>
                    <th className="w-28 border-b border-edge px-3 py-3 text-right font-semibold">
                      Payment
                    </th>
                    <th className="w-40 border-b border-edge px-3 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-edge">
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
                        className="bg-surface transition-colors hover:bg-surface-2/60"
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

                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-accent">
                          {r._isDebit ? debitTotal.toFixed(2) : "—"}
                        </td>

                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-success">
                          {!r._isDebit ? creditAmt.toFixed(2) : "—"}
                        </td>

                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => void onSaveRow(r)}
                              disabled={isSaving || deletingTxId === r.id}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSaving ? "Saving…" : "Save"}
                            </button>

                            <button
                              type="button"
                              onClick={() => void onDeleteRow(r)}
                              disabled={isSaving || deletingTxId === r.id}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-danger/30 bg-danger-soft px-3 text-sm font-medium text-danger-soft-fg transition hover:border-danger/50 disabled:cursor-not-allowed disabled:opacity-60"
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

            <div className="border-t border-edge px-4 py-2 text-xs text-fg-muted">
              Debit Total = Amount + GST. Credit has no GST.
            </div>
          </section>
        );
      })}
    </div>
  );
}
