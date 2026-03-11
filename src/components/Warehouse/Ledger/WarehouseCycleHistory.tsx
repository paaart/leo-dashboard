"use client";

import type { WarehouseCycle, WarehouseTxn } from "@/lib/warehouse/types";
import {
  fmtINR,
  fmtDate,
  sortTxAsc,
  computeCycleTotals,
  toLedgerTxVM,
} from "@/lib/warehouse/ledgerMath";

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
                                const vm = toLedgerTxVM(t);

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
