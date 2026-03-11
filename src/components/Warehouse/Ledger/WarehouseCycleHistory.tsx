"use client";

import type { WarehouseCycle, WarehouseTxn } from "@/lib/warehouse/types";

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function fmtINR(n: number) {
  return `₹${round2(n).toFixed(2)}`;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";

  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";

  return dt.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function sortTxAsc(a: WarehouseTxn, b: WarehouseTxn) {
  const d = a.tx_date.localeCompare(b.tx_date);
  if (d !== 0) return d;
  const ca = String(a.created_at ?? "");
  const cb = String(b.created_at ?? "");
  return ca.localeCompare(cb);
}

function computeCycleTotals(rows: WarehouseTxn[]) {
  let incurred = 0;
  let paid = 0;

  for (const t of rows) {
    const amount = Number(t.amount) || 0;
    const gstRate = Number(t.gst_rate ?? 0) || 0;

    if (amount > 0) {
      incurred += amount + amount * (gstRate / 100);
    } else if (amount < 0) {
      paid += Math.abs(amount);
    }
  }

  return {
    incurred: round2(incurred),
    paid: round2(paid),
    outstanding: round2(incurred - paid),
  };
}

function computeVM(t: WarehouseTxn) {
  const amtSigned = Number(t.amount) || 0;
  const isDebit = amtSigned > 0;

  const amountAbs = round2(Math.abs(amtSigned));
  const gstRate = isDebit ? round2(Number(t.gst_rate ?? 0) || 0) : 0;
  const debitTotal = isDebit
    ? round2(amountAbs + amountAbs * (gstRate / 100))
    : 0;
  const creditAmount = !isDebit ? amountAbs : 0;

  return {
    ...t,
    _isDebit: isDebit,
    _amountAbs: amountAbs,
    _gstRate: gstRate,
    _debitTotal: debitTotal,
    _creditAmount: creditAmount,
  };
}

export default function WarehouseCycleHistory({
  previousCycles,
  openCycleId,
  setOpenCycleId,
  cycleTxCache,
  onLoadCycleTransactions,
}: {
  previousCycles: WarehouseCycle[];
  openCycleId: string | null;
  setOpenCycleId: (id: string | null) => void;
  cycleTxCache: Record<string, WarehouseTxn[]>;
  onLoadCycleTransactions: (cycleId: string) => Promise<void>;
}) {
  return (
    <div className="mt-10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cycle History</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {previousCycles.length} cycle{previousCycles.length === 1 ? "" : "s"}
        </span>
      </div>

      {previousCycles.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          No previous cycles.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {previousCycles.map((c) => {
            const isOpen = openCycleId === c.id;
            const rows = cycleTxCache[c.id] ?? null;
            const totals = rows ? computeCycleTotals(rows) : null;

            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-[#1f2933]"
              >
                <button
                  onClick={async () => {
                    if (isOpen) {
                      setOpenCycleId(null);
                      return;
                    }

                    setOpenCycleId(c.id);

                    if (!cycleTxCache[c.id]) {
                      await onLoadCycleTransactions(c.id);
                    }
                  }}
                  className="w-full px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {fmtDate(c.cycle_start)} → {fmtDate(c.cycle_end)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Status: {c.status}
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-between gap-6 xl:justify-end">
                      <div className="flex flex-wrap gap-6 text-sm">
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Incurred
                          </div>
                          <div className="font-medium text-blue-700 dark:text-blue-300">
                            {totals ? fmtINR(totals.incurred) : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Paid
                          </div>
                          <div className="font-medium text-green-700 dark:text-green-300">
                            {totals ? fmtINR(totals.paid) : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Outstanding
                          </div>
                          <div
                            className={`font-medium ${
                              totals && totals.outstanding > 0
                                ? "text-red-700 dark:text-red-300"
                                : "text-green-700 dark:text-green-300"
                            }`}
                          >
                            {totals ? fmtINR(totals.outstanding) : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-sm font-medium text-gray-600 dark:text-gray-300">
                        {isOpen ? "Hide" : "View"}
                      </div>
                    </div>
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1f2933]">
                    {!rows ? (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Loading…
                      </p>
                    ) : rows.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        No transactions.
                      </p>
                    ) : (
                      <div className="overflow-auto">
                        <table className="min-w-275 w-full">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="w-32 p-2 text-left text-sm">
                                Date
                              </th>
                              <th className="p-2 text-left text-sm">Title</th>
                              <th className="p-2 text-left text-sm">Note</th>
                              <th className="w-28 p-2 text-right text-sm">
                                Debit Amt
                              </th>
                              <th className="w-24 p-2 text-right text-sm">
                                GST %
                              </th>
                              <th className="w-32 p-2 text-right text-sm">
                                Debit Total
                              </th>
                              <th className="w-28 p-2 text-right text-sm">
                                Credit
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {rows
                              .slice()
                              .sort(sortTxAsc)
                              .map((t) => {
                                const vm = computeVM(t);

                                return (
                                  <tr key={t.id}>
                                    <td className="p-2 text-sm text-gray-700 dark:text-gray-300">
                                      {fmtDate(t.tx_date)}
                                    </td>
                                    <td className="p-2 text-sm text-gray-900 dark:text-white">
                                      {t.title}
                                    </td>
                                    <td className="p-2 text-sm text-gray-600 dark:text-gray-300">
                                      {t.note ?? "—"}
                                    </td>
                                    <td className="p-2 text-right text-sm font-medium text-blue-700 dark:text-blue-300">
                                      {vm._isDebit
                                        ? vm._amountAbs.toFixed(2)
                                        : "—"}
                                    </td>
                                    <td className="p-2 text-right text-sm">
                                      {vm._isDebit
                                        ? vm._gstRate.toFixed(2)
                                        : "—"}
                                    </td>
                                    <td className="p-2 text-right text-sm font-medium text-blue-700 dark:text-blue-300">
                                      {vm._isDebit
                                        ? vm._debitTotal.toFixed(2)
                                        : "—"}
                                    </td>
                                    <td className="p-2 text-right text-sm font-medium text-green-700 dark:text-green-300">
                                      {!vm._isDebit
                                        ? vm._creditAmount.toFixed(2)
                                        : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>

                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Previous cycles are read-only.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
