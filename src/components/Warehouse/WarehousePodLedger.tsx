"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import {
  accrueWarehouseCharges,
  type WarehousePodSummary,
  type WarehouseTxn,
  // ✅ new imports for cycles
  fetchPodCycles,
  fetchCycleTransactions,
  fetchActiveCycleIdOrThrow,
} from "@/lib/warehouse";
import type { WarehouseCycle } from "@/lib/warehouse/types";
import { supabase } from "@/lib/supabaseClient";

import WarehouseTxModal from "./WarehouseTxModal";
import {
  addWarehouseTransaction,
  recordWarehousePayment,
} from "@/lib/warehouse";

type MonthKey = string; // "YYYY-MM-01"

type TxVM = WarehouseTxn & {
  _amountAbs: number; // abs for UI
  _isDebit: boolean; // debit means amount > 0
  _gstRate: number; // % (0 for credits)
  _gstAmount: number; // INR
  _debitTotal: number; // amount + gst (only debit)
  _creditAmount: number; // abs(amount) if credit else 0
};

type EditDraft = {
  amount: string; // abs amount in UI
  gst_rate: string; // % string
  title: string;
  note: string;
  tx_date: string; // YYYY-MM-DD
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

function fmtDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, day ?? 1);
  return dt.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toMonthKeyFromISODate(isoDate: string): MonthKey {
  return `${isoDate.slice(0, 7)}-01`;
}

function clampNumberString(s: string) {
  if (s.trim() === "") return "";
  const cleaned = s.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function computeVM(t: WarehouseTxn): TxVM {
  const amtSigned = Number(t.amount) || 0;
  const isDebit = amtSigned > 0;

  const amountAbs = round2(Math.abs(amtSigned));
  const gstRate = isDebit ? round2(Number(t.gst_rate ?? 0) || 0) : 0;

  const gstAmount = isDebit ? round2(amountAbs * (gstRate / 100)) : 0;
  const debitTotal = isDebit ? round2(amountAbs + gstAmount) : 0;
  const creditAmount = !isDebit ? amountAbs : 0;

  return {
    ...t,
    _amountAbs: amountAbs,
    _isDebit: isDebit,
    _gstRate: gstRate,
    _gstAmount: gstAmount,
    _debitTotal: debitTotal,
    _creditAmount: creditAmount,
  };
}

function sortTxAsc(a: WarehouseTxn, b: WarehouseTxn) {
  const d = a.tx_date.localeCompare(b.tx_date);
  if (d !== 0) return d;
  const ca = String(a.created_at ?? "");
  const cb = String(b.created_at ?? "");
  return ca.localeCompare(cb);
}

export default function WarehousePodLedgerView({
  pod,
  onBack,
}: {
  pod: WarehousePodSummary;
  onBack: () => void;
}) {
  const [tx, setTx] = useState<WarehouseTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTx, setOpenTx] = useState(false);
  const [openPay, setOpenPay] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // ✅ cycles state
  const [cycles, setCycles] = useState<WarehouseCycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [openCycleId, setOpenCycleId] = useState<string | null>(null);
  const [cycleTxCache, setCycleTxCache] = useState<
    Record<string, WarehouseTxn[]>
  >({});

  const activeCycle = useMemo(
    () => cycles.find((c) => c.id === activeCycleId) ?? null,
    [cycles, activeCycleId]
  );

  const previousCycles = useMemo(
    () => cycles.filter((c) => c.id !== activeCycleId),
    [cycles, activeCycleId]
  );

  const cellInput =
    "w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm text-gray-900 dark:text-white";

  const updateDraft = (id: string, patch: Partial<EditDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const load = async () => {
    setLoading(true);
    try {
      await accrueWarehouseCharges(pod.id);

      // ✅ load cycles + active cycle id
      const [allCycles, actId] = await Promise.all([
        fetchPodCycles(pod.id),
        fetchActiveCycleIdOrThrow(pod.id),
      ]);

      setCycles(allCycles);
      setActiveCycleId(actId);

      // ✅ ACTIVE cycle ledger only (editable)
      const rows = await fetchCycleTransactions(actId);
      const sorted = [...rows].sort(sortTxAsc);
      setTx(sorted);

      // init drafts from DB rows
      const init: Record<string, EditDraft> = {};
      for (const r of sorted) {
        const vm = computeVM(r);
        init[r.id] = {
          amount: vm._amountAbs ? String(vm._amountAbs) : "",
          gst_rate: vm._isDebit ? String(vm._gstRate) : "0",
          title: String(r.title ?? "Transaction"),
          note: String(r.note ?? ""),
          tx_date: r.tx_date,
        };
      }
      setDrafts(init);

      // Optional: reset opened previous cycle if it no longer exists
      if (openCycleId && !allCycles.some((c) => c.id === openCycleId)) {
        setOpenCycleId(null);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load ledger");
      setTx([]);
      setDrafts({});
      setCycles([]);
      setActiveCycleId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod.id]);

  const effectiveRows = useMemo(() => {
    return tx.map((t) => {
      const d = drafts[t.id];
      if (!d) return t;

      return {
        ...t,
        tx_date: d.tx_date,
        title: d.title,
        note: d.note.trim() ? d.note : null,
      };
    });
  }, [tx, drafts]);

  const vmRows = useMemo(() => effectiveRows.map(computeVM), [effectiveRows]);

  const months = useMemo(() => {
    const map = new Map<MonthKey, TxVM[]>();

    for (const r of vmRows) {
      const k = toMonthKeyFromISODate(r.tx_date);
      const list = map.get(k) ?? [];
      list.push(r);
      map.set(k, list);
    }

    for (const [, list] of map) {
      list.sort(sortTxAsc);
    }

    const keys = [...map.keys()].sort((a, b) => a.localeCompare(b));
    return keys.map((k) => ({ monthKey: k, rows: map.get(k) ?? [] }));
  }, [vmRows]);

  const totals = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);

    let totalDebit = 0;
    let totalCredit = 0;

    let currentDebit = 0;
    let currentCredit = 0;

    for (const r of vmRows) {
      if (r._isDebit) totalDebit += r._debitTotal;
      else totalCredit += r._creditAmount;

      if (r.tx_date <= todayKey) {
        if (r._isDebit) currentDebit += r._debitTotal;
        else currentCredit += r._creditAmount;
      }
    }

    const currentDue = round2(currentDebit - currentCredit);

    return {
      totalDebit: round2(totalDebit),
      totalCredit: round2(totalCredit),
      currentDebit: round2(currentDebit),
      currentCredit: round2(currentCredit),
      currentDue,
    };
  }, [vmRows]);

  const saveRow = async (row: TxVM) => {
    const d = drafts[row.id];
    if (!d) return;

    const amountAbs = Number(d.amount || 0);
    if (Number.isNaN(amountAbs) || amountAbs <= 0) {
      toast.error("Amount must be > 0");
      return;
    }

    const gst = row._isDebit ? Number(d.gst_rate || 0) : 0;
    if (Number.isNaN(gst) || gst < 0) {
      toast.error("GST must be 0 or more");
      return;
    }

    const signedAmount = row._isDebit ? amountAbs : -Math.abs(amountAbs);

    setSavingId(row.id);
    try {
      const payload = {
        amount: round2(signedAmount),
        gst_rate: row._isDebit ? round2(gst) : 0,
        title: d.title.trim() ? d.title.trim() : "Transaction",
        note: d.note.trim() ? d.note.trim() : null,
        tx_date: d.tx_date,
      };

      const { error } = await supabase
        .from("warehouse_pod_transactions")
        .update(payload)
        .eq("id", row.id);

      if (error) throw error;

      setTx((prev) => {
        const next = prev.map((t) =>
          t.id === row.id ? ({ ...t, ...payload } as WarehouseTxn) : t
        );
        next.sort(sortTxAsc);
        return next;
      });

      toast.success("Saved");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to save");
    } finally {
      setSavingId(null);
    }
  };

  const pill =
    "text-xs rounded-full px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mx-auto p-8 bg-white dark:bg-[#23272f] rounded shadow">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Pods
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Refresh
          </button>

          <button
            onClick={() => setOpenTx(true)}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            + Add Transaction
          </button>

          <button
            onClick={() => setOpenPay(true)}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            + Record Payment
          </button>
        </div>
      </div>

      <h2 className="text-xl font-semibold">{pod.name}</h2>

      <div className="mt-2 flex flex-wrap gap-2">
        <span className={pill}>Client: {pod.client_id ?? "—"}</span>
        <span className={pill}>Contact: {pod.contact}</span>
        <span className={pill}>Company: {pod.company_name ?? "—"}</span>
        <span className={pill}>Location: {pod.location_name ?? "—"}</span>
        <span className={pill}>
          Next charge: {fmtDate(pod.next_charge_date)}
        </span>
        <span className={pill}>
          Next payment: {fmtDate(pod.next_payment_date)}
        </span>

        {/* ✅ Renewal date from active cycle */}
        <span className={pill}>
          Renewal: {activeCycle ? fmtDate(activeCycle.cycle_end) : "—"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat
          title="Current Due (as of today)"
          value={fmtINR(totals.currentDue)}
          tone={totals.currentDue > 0 ? "red" : "green"}
          sub={`Debit ${fmtINR(totals.currentDebit)} • Credit ${fmtINR(
            totals.currentCredit
          )}`}
        />

        <Stat
          title="Total Credit"
          value={fmtINR(totals.totalCredit)}
          tone="green"
          sub="(Payments received)"
        />

        <Stat
          title="Total Debit"
          value={fmtINR(totals.totalDebit)}
          tone="blue"
          sub="(Amount + GST)"
        />
      </div>

      {months.length === 0 ? (
        <p className="mt-6 text-gray-600 dark:text-gray-300">
          No transactions yet.
        </p>
      ) : (
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
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f2933]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {monthLabel(m.monthKey)}
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-blue-800 dark:text-blue-200">
                      Debit: {fmtINR(monthDebit)}
                    </span>
                    <span className="rounded bg-green-50 dark:bg-green-900/20 px-2 py-1 text-green-800 dark:text-green-200">
                      Credit: {fmtINR(monthCredit)}
                    </span>
                    <span
                      className={`rounded px-2 py-1 ${
                        monthNet > 0
                          ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                          : "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                      }`}
                    >
                      Net: {fmtINR(monthNet)}
                    </span>
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-[1100px] w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="p-2 text-left text-sm w-[140px]">
                          Date
                        </th>
                        <th className="p-2 text-left text-sm">Title</th>
                        <th className="p-2 text-left text-sm">Note</th>

                        <th className="p-2 text-right text-sm w-[120px]">
                          Debit Amt
                        </th>
                        <th className="p-2 text-right text-sm w-[90px]">
                          GST %
                        </th>
                        <th className="p-2 text-right text-sm w-[140px]">
                          Debit Total
                        </th>

                        <th className="p-2 text-right text-sm w-[120px]">
                          Credit
                        </th>

                        <th className="p-2 text-right text-sm w-[120px]">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {m.rows.map((r) => {
                        const d = drafts[r.id];
                        if (!d) return null;

                        const amountAbs = Number(d.amount || 0);
                        const gstRate = r._isDebit
                          ? Number(d.gst_rate || 0)
                          : 0;

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

                            <td className="p-2 min-w-[220px]">
                              <input
                                className={cellInput}
                                value={d.title}
                                onChange={(e) =>
                                  updateDraft(r.id, { title: e.target.value })
                                }
                                placeholder="Title"
                              />
                            </td>

                            <td className="p-2 min-w-[260px]">
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
                                onClick={() => void saveRow(r)}
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
      )}

      {/* ✅ PREVIOUS CYCLES (collapsed) */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Previous cycles</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {previousCycles.length} cycle
            {previousCycles.length === 1 ? "" : "s"}
          </span>
        </div>

        {previousCycles.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            No previous cycles.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {previousCycles.map((c) => {
              const isOpen = openCycleId === c.id;
              const rows = cycleTxCache[c.id] ?? null;

              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={async () => {
                      if (openCycleId === c.id) {
                        setOpenCycleId(null);
                        return;
                      }

                      setOpenCycleId(c.id);

                      if (!cycleTxCache[c.id]) {
                        try {
                          const t = await fetchCycleTransactions(c.id);
                          setCycleTxCache((prev) => ({ ...prev, [c.id]: t }));
                        } catch (err: unknown) {
                          toast.error(
                            getErrorMessage(err) ||
                              "Failed to load cycle history"
                          );
                        }
                      }
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {fmtDate(c.cycle_start)} → {fmtDate(c.cycle_end)}
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        ({c.status})
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {isOpen ? "Hide" : "View"}
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="p-4 bg-white dark:bg-[#1f2933]">
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
                          <table className="min-w-[1100px] w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="p-2 text-left text-sm w-[140px]">
                                  Date
                                </th>
                                <th className="p-2 text-left text-sm">Title</th>
                                <th className="p-2 text-left text-sm">Note</th>
                                <th className="p-2 text-right text-sm w-[120px]">
                                  Debit Amt
                                </th>
                                <th className="p-2 text-right text-sm w-[90px]">
                                  GST %
                                </th>
                                <th className="p-2 text-right text-sm w-[140px]">
                                  Debit Total
                                </th>
                                <th className="p-2 text-right text-sm w-[120px]">
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
                                  const debitAmt = vm._isDebit
                                    ? vm._amountAbs
                                    : 0;
                                  const debitTotal = vm._isDebit
                                    ? vm._debitTotal
                                    : 0;
                                  const creditAmt = vm._isDebit
                                    ? 0
                                    : vm._creditAmount;

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
                                        {debitAmt ? debitAmt.toFixed(2) : "—"}
                                      </td>

                                      <td className="p-2 text-right text-sm">
                                        {vm._isDebit
                                          ? vm._gstRate.toFixed(2)
                                          : "—"}
                                      </td>

                                      <td className="p-2 text-right text-sm font-medium text-blue-700 dark:text-blue-300">
                                        {debitTotal
                                          ? debitTotal.toFixed(2)
                                          : "—"}
                                      </td>

                                      <td className="p-2 text-right text-sm font-medium text-green-700 dark:text-green-300">
                                        {creditAmt ? creditAmt.toFixed(2) : "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>

                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Previous cycles are read-only. Current cycle is
                            editable above.
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

      <WarehouseTxModal
        open={openTx}
        title="Add Transaction"
        kind="transaction"
        onClose={() => setOpenTx(false)}
        onSubmit={async (v) => {
          await addWarehouseTransaction({
            podId: pod.id,
            type: v.type ?? "charge",
            amount: v.amount,
            gstRate: v.gstRate ?? 18,
            txDate: v.txDate,
            title: v.title,
            note: v.note,
          });
          toast.success("Transaction added");
          await load();
        }}
      />

      <WarehouseTxModal
        open={openPay}
        title="Record Payment"
        kind="payment"
        onClose={() => setOpenPay(false)}
        onSubmit={async (v) => {
          await recordWarehousePayment({
            podId: pod.id,
            amount: v.amount,
            txDate: v.txDate,
            title: v.title,
            note: v.note,
          });
          toast.success("Payment recorded");
          await load();
        }}
      />
    </div>
  );
}

function Stat({
  title,
  value,
  tone,
  sub,
}: {
  title: string;
  value: string;
  tone: "blue" | "green" | "red";
  sub?: string;
}) {
  const toneClass =
    tone === "blue"
      ? "text-blue-700 dark:text-blue-300"
      : tone === "green"
      ? "text-green-700 dark:text-green-300"
      : "text-red-700 dark:text-red-300";

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f2933] p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
      {sub ? (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {sub}
        </div>
      ) : null}
    </div>
  );
}
