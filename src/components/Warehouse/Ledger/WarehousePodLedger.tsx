"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

import type {
  WarehousePodSummary,
  WarehouseTxn,
  WarehouseCycle,
} from "@/lib/warehouse/types";

import {
  accrueWarehouseCharges,
  fetchPodCycles,
  fetchActiveCycleIdOrThrow,
} from "@/lib/warehouse/pods";

import {
  fetchCycleTransactions,
  addWarehouseTransaction,
  recordWarehousePayment,
  updateWarehouseTransaction,
  applyMidCycleRateChange,
  closeWarehouseCycle,
} from "@/lib/warehouse/ledger";

import WarehouseTxModal from "./WarehouseTxModal";
import WarehouseRateChangeModal from "./WarehouseRateChangeModal";
import WarehouseRenewModal from "./WarehouseRenewModal";
import WarehouseLedgerSummaryCard from "./WarehouseLedgerSummaryCard";
import WarehouseLedgerTotals from "./WarehouseLedgerTotals";
import WarehouseCurrentLedgerTable from "./WarehouseCurrentLedgerTable";
import WarehouseCycleHistory from "./WarehouseCycleHistory";

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

function toMonthKeyFromISODate(isoDate: string): MonthKey {
  return `${isoDate.slice(0, 7)}-01`;
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
  const [openRate, setOpenRate] = useState(false);
  const [openRenew, setOpenRenew] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [closingCycle, setClosingCycle] = useState(false);

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

  const latestCycle = useMemo(() => {
    if (cycles.length === 0) return null;
    return [...cycles].sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at))
    )[0];
  }, [cycles]);

  const hasActiveCycle = Boolean(activeCycleId);
  const currentCycle = activeCycle ?? latestCycle ?? null;

  const previousCycles = useMemo(() => {
    if (activeCycleId) {
      return cycles.filter((c) => c.id !== activeCycleId);
    }
    return cycles;
  }, [cycles, activeCycleId]);

  const latestClosedCycleId = useMemo(() => {
    if (hasActiveCycle) return null;
    return cycles[0]?.id ?? null;
  }, [hasActiveCycle, cycles]);

  const isClosedView = !activeCycleId && !!latestCycle?.id;

  const cellInput =
    "w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm text-gray-900 dark:text-white";

  const updateDraft = (id: string, patch: Partial<EditDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const load = async () => {
    setLoading(true);

    try {
      try {
        await accrueWarehouseCharges(pod.id);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to refresh latest charges");
      }

      const allCycles = await fetchPodCycles(pod.id);
      setCycles(allCycles);

      let actId: string | null = null;
      try {
        actId = await fetchActiveCycleIdOrThrow(pod.id);
      } catch {
        actId = null;
      }

      setActiveCycleId(actId);

      const cycleToShow = actId ?? allCycles[0]?.id ?? null;

      if (!cycleToShow) {
        setTx([]);
        setDrafts({});
        setOpenCycleId(null);
        return;
      }

      const rows = await fetchCycleTransactions(cycleToShow);
      const sorted = [...rows].sort(sortTxAsc);
      setTx(sorted);

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

  useEffect(() => {
    if (!hasActiveCycle && latestClosedCycleId) {
      setOpenCycleId(latestClosedCycleId);

      if (!cycleTxCache[latestClosedCycleId]) {
        void (async () => {
          try {
            const rows = await fetchCycleTransactions(latestClosedCycleId);
            setCycleTxCache((prev) => ({
              ...prev,
              [latestClosedCycleId]: rows,
            }));
          } catch (err: unknown) {
            toast.error(
              getErrorMessage(err) || "Failed to load closed cycle history"
            );
          }
        })();
      }
    }
  }, [hasActiveCycle, latestClosedCycleId, cycleTxCache]);

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

    const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
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
    if (isClosedView) {
      toast.error("Closed cycle is read-only");
      return;
    }

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
        id: row.id,
        amount: round2(signedAmount),
        gst_rate: row._isDebit ? round2(gst) : 0,
        title: d.title.trim() ? d.title.trim() : "Transaction",
        note: d.note.trim() ? d.note.trim() : null,
        tx_date: d.tx_date,
      };

      await updateWarehouseTransaction(payload);

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

  const handleCloseCycle = async () => {
    if (!activeCycleId) {
      toast.error("No active cycle to close");
      return;
    }

    setClosingCycle(true);
    try {
      await closeWarehouseCycle(pod.id);
      toast.success("Cycle closed");
      await load();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to close cycle");
    } finally {
      setClosingCycle(false);
    }
  };

  const handleDownloadStatement = () => {
    window.open(`/warehouse/statement?podId=${pod.id}`, "_blank");
  };

  const handleRenewCycle = () => {
    setOpenRenew(true);
  };

  const handleEditClient = () => {
    toast("Edit Client Details UI/API can be connected next");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mx-auto rounded bg-white p-8 shadow dark:bg-[#23272f]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Pods
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => void load()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Refresh
          </button>

          <button
            onClick={handleDownloadStatement}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Download Statement
          </button>
        </div>
      </div>

      <h2 className="text-xl font-semibold">
        {activeCycle ? "Current Cycle Ledger" : "Latest Closed Cycle Ledger"}
      </h2>

      <WarehouseLedgerSummaryCard
        pod={pod}
        currentCycle={currentCycle}
        hasActiveCycle={hasActiveCycle}
        onRecordPayment={() => setOpenPay(true)}
        onAddTransaction={() => setOpenTx(true)}
        onRateChange={() => setOpenRate(true)}
        onCloseCycle={() => void handleCloseCycle()}
        onRenewCycle={handleRenewCycle}
        onEditClient={handleEditClient}
        closingCycle={closingCycle}
        isClosedView={isClosedView}
      />

      {!activeCycle && (
        <div className="mt-6 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          This cycle is closed. Ledger is read-only. Payments can still be
          recorded.
        </div>
      )}

      <WarehouseLedgerTotals
        currentDue={fmtINR(totals.currentDue)}
        currentDebit={fmtINR(totals.currentDebit)}
        currentCredit={fmtINR(totals.currentCredit)}
        totalCredit={fmtINR(totals.totalCredit)}
        totalDebit={fmtINR(totals.totalDebit)}
      />

      {hasActiveCycle ? (
        <WarehouseCurrentLedgerTable
          months={months}
          drafts={drafts}
          cellInput={cellInput}
          savingId={savingId}
          updateDraft={updateDraft}
          onSaveRow={saveRow}
        />
      ) : (
        <div className="mt-6 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          No active cycle. The latest closed cycle is shown below in history
          view. Payments can still be recorded.
        </div>
      )}

      <WarehouseCycleHistory
        previousCycles={previousCycles}
        openCycleId={openCycleId}
        setOpenCycleId={setOpenCycleId}
        cycleTxCache={cycleTxCache}
        onLoadCycleTransactions={async (cycleId) => {
          try {
            const t = await fetchCycleTransactions(cycleId);
            setCycleTxCache((prev) => ({ ...prev, [cycleId]: t }));
          } catch (err: unknown) {
            toast.error(getErrorMessage(err) || "Failed to load cycle history");
          }
        }}
      />

      {!isClosedView && (
        <>
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

          <WarehouseRateChangeModal
            open={openRate}
            onClose={() => {
              setOpenRate(false);
              void load();
            }}
            oldRate={Number(pod.rate)}
            onSubmit={async (v) => {
              await applyMidCycleRateChange({
                podId: pod.id,
                oldRate: Number(pod.rate),
                newRate: v.newRate,
                effectiveDate: v.effectiveDate,
                extraDays: v.extraDays,
                gstRate: v.gstRate,
                addExtraChargeNow: v.addExtraChargeNow,
                note: v.note ?? null,
              });

              toast.success("Rate change applied");
              setOpenRate(false);
              void load();
            }}
          />
        </>
      )}

      <WarehouseRenewModal
        open={openRenew}
        podId={pod.id}
        clientId={pod.client_id ?? "—"}
        clientName={pod.name}
        defaultRate={Number(pod.rate)}
        defaultDurationMonths={Number(pod.duration_months ?? 12)}
        defaultInsuranceProvider={pod.insurance_provider}
        defaultInsuranceValue={Number(pod.insurance_value ?? 0)}
        defaultInsuranceIdv={Number(pod.insurance_idv ?? 0)}
        endDate={currentCycle?.cycle_end ?? null}
        onClose={() => setOpenRenew(false)}
        onDone={async () => {
          setOpenRenew(false);
          toast.success("Cycle renewed");
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
            cycleId: activeCycleId ?? latestCycle?.id ?? undefined,
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
