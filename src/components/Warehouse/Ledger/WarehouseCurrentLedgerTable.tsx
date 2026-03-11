"use client";

import type { WarehouseTxn } from "@/lib/warehouse/types";

type MonthKey = string;

type TxVM = WarehouseTxn & {
  _amountAbs: number;
  _isDebit: boolean;
  _gstRate: number;
  _gstAmount: number;
  _debitTotal: number;
  _creditAmount: number;
};

type EditDraft = {
  amount: string;
  gst_rate: string;
  title: string;
  note: string;
  tx_date: string;
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function fmtINR(n: number) {
  return `₹${round2(n).toFixed(2)}`;
}

function monthLabel(monthKey: MonthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, 1);
  return dt.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function clampNumberString(s: string) {
  if (s.trim() === "") return "";
  const cleaned = s.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

export default function WarehouseCurrentLedgerTable({
  months,
  drafts,
  cellInput,
  savingId,
  updateDraft,
  onSaveRow,
}: {
  months: Array<{ monthKey: string; rows: TxVM[] }>;
  drafts: Record<string, EditDraft>;
  cellInput: string;
  savingId: string | null;
  updateDraft: (id: string, patch: Partial<EditDraft>) => void;
  onSaveRow: (row: TxVM) => Promise<void>;
}) {
  if (months.length === 0) {
    return (
      <p className="mt-6 text-gray-600 dark:text-gray-300">
        No transactions yet.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {months.map((m) => {
        const monthDebit = m.rows.reduce(
          (s, r) => s + (r._isDebit ? r._debitTotal : 0),
          0
        );
        const monthCredit = m.rows.reduce(
          (s, r) => s + (!r._isDebit ? r._creditAmount : 0),
          0
        );
        const monthNet = round2(monthDebit - monthCredit);

        return (
          <section
            key={m.monthKey}
            className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#1f2933]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="font-semibold text-gray-900 dark:text-white">
                {monthLabel(m.monthKey)}
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded bg-blue-50 px-2 py-1 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                  Debit: {fmtINR(monthDebit)}
                </span>
                <span className="rounded bg-green-50 px-2 py-1 text-green-800 dark:bg-green-900/20 dark:text-green-200">
                  Credit: {fmtINR(monthCredit)}
                </span>
                <span
                  className={`rounded px-2 py-1 ${
                    monthNet > 0
                      ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200"
                      : "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200"
                  }`}
                >
                  Net: {fmtINR(monthNet)}
                </span>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-275 w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="w-32 p-2 text-left text-sm">Date</th>
                    <th className="p-2 text-left text-sm">Title</th>
                    <th className="p-2 text-left text-sm">Note</th>
                    <th className="w-28 p-2 text-right text-sm">Debit Amt</th>
                    <th className="w-24 p-2 text-right text-sm">GST %</th>
                    <th className="w-32 p-2 text-right text-sm">Debit Total</th>
                    <th className="w-28 p-2 text-right text-sm">Credit</th>
                    <th className="w-28 p-2 text-right text-sm">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
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
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="p-2">
                          <input
                            className={cellInput}
                            type="date"
                            value={d.tx_date}
                            onChange={(e) =>
                              updateDraft(r.id, { tx_date: e.target.value })
                            }
                          />
                        </td>

                        <td className="p-2 min-w-52">
                          <input
                            className={cellInput}
                            value={d.title}
                            onChange={(e) =>
                              updateDraft(r.id, { title: e.target.value })
                            }
                            placeholder="Title"
                          />
                        </td>

                        <td className="p-2 min-w-64">
                          <input
                            className={cellInput}
                            value={d.note}
                            onChange={(e) =>
                              updateDraft(r.id, { note: e.target.value })
                            }
                            placeholder="Optional note"
                          />
                        </td>

                        <td className="p-2 text-right">
                          <input
                            className={cellInput}
                            inputMode="decimal"
                            value={d.amount}
                            onChange={(e) =>
                              updateDraft(r.id, {
                                amount: clampNumberString(e.target.value),
                              })
                            }
                          />
                        </td>

                        <td className="p-2 text-right">
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

                        <td className="p-2 text-right font-medium text-blue-700 dark:text-blue-300">
                          {r._isDebit ? debitTotal.toFixed(2) : "—"}
                        </td>

                        <td className="p-2 text-right font-medium text-green-700 dark:text-green-300">
                          {!r._isDebit ? creditAmt.toFixed(2) : "—"}
                        </td>

                        <td className="p-2 text-right">
                          <button
                            onClick={() => void onSaveRow(r)}
                            disabled={isSaving}
                            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {isSaving ? "Saving…" : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
              Debit Total = Amount + GST. Credit has no GST.
            </div>
          </section>
        );
      })}
    </div>
  );
}
