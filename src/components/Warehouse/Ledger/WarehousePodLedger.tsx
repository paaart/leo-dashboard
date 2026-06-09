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
  deleteWarehouseTransaction,
} from "@/lib/warehouse/ledger";

import {
  round2,
  fmtINR,
  sortTxAsc,
  toLedgerVMRows,
  groupLedgerRowsByMonth,
  computeLedgerTotals,
  buildEditDraftMap,
  type LedgerTxVM,
} from "@/lib/warehouse/ledgerMath";

import WarehouseTxModal from "./WarehouseTxModal";
import WarehouseRateChangeModal from "./WarehouseRateChangeModal";
import WarehouseRenewModal from "./WarehouseRenewModal";
import WarehouseLedgerSummaryCard from "./WarehouseLedgerSummaryCard";
import WarehouseLedgerTotals from "./WarehouseLedgerTotals";
import WarehouseCurrentLedgerTable from "./WarehouseCurrentLedgerTable";
import WarehouseCycleHistory from "./WarehouseCycleHistory";
import EditClientModal from "./EditClientModal";
import CloseCycleConfirmModal from "./CloseCycleConfirmModal";
import { LoadingState, PageHeader } from "@/components/shared/DashboardUI";

type EditDraft = {
  amount: string;
  gst_rate: string;
  title: string;
  note: string;
  tx_date: string;
};

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
  const [openEditClient, setOpenEditClient] = useState(false);
  const [openCloseConfirm, setOpenCloseConfirm] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [closingCycle, setClosingCycle] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

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
    "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50";

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
      setDrafts(buildEditDraftMap(sorted));

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

  const vmRows = useMemo(() => toLedgerVMRows(effectiveRows), [effectiveRows]);

  const months = useMemo(() => groupLedgerRowsByMonth(vmRows), [vmRows]);

  const totals = useMemo(() => computeLedgerTotals(vmRows), [vmRows]);

  const saveRow = async (row: LedgerTxVM) => {
    if (isClosedView) {
      toast.error("Closed cycle is read-only");
      return;
    }

    const d = drafts[row.id];
    if (!d) return;

    const amountAbs = Number(d.amount || 0);
    if (Number.isNaN(amountAbs) || amountAbs < 0) {
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
        last_known_updated_at: row.updated_at ?? null,
        last_known_created_at: row.created_at ?? "",
      };

      const res = await updateWarehouseTransaction(payload);

      setTx((prev) => {
        const next = prev.map((t) =>
          t.id === row.id
            ? ({
                ...t,
                ...payload,
                updated_at: res.updated_at ?? t.updated_at ?? null,
              } as WarehouseTxn)
            : t
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
    const params = new URLSearchParams({
      podId: pod.id,
      name: pod.name ?? "",
      clientId: pod.client_id ?? "",
      company: pod.company_name ?? "",
      contact: pod.contact ?? "",
      email: pod.email ?? "",
      location: pod.location_name ?? "",
      billingStartDate: pod.billing_start_date ?? "",
      billingInterval: pod.billing_interval ?? "",
    });

    window.open(`/warehouse/statement?${params.toString()}`, "_blank");
  };

  const handleRenewCycle = () => {
    setOpenRenew(true);
  };

  const handleEditClient = () => {
    setOpenEditClient(true);
  };

  const deleteRow = async (row: LedgerTxVM) => {
    if (isClosedView) {
      toast.error("Closed cycle is read-only");
      return;
    }

    if (row.title === "Auto charge") {
      toast.error(
        "Auto-generated storage charges cannot be deleted. Add an adjustment instead."
      );
      return;
    }

    const ok = window.confirm(
      `Delete transaction "${row.title}"?\n\nThis cannot be undone.`
    );

    if (!ok) return;

    setDeletingTxId(row.id);

    try {
      await deleteWarehouseTransaction(row.id);

      setTx((prev) => prev.filter((t) => t.id !== row.id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });

      toast.success("Transaction deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to delete transaction");
    } finally {
      setDeletingTxId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader
            eyebrow="Storage"
            title="Warehouse Management"
            subtitle="Manage warehouse clients, PODs, billing, payments, and storage ledgers."
          />
          <LoadingState label="Loading warehouse ledger" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Storage"
        title={activeCycle ? "Current Ledger" : "Latest Closed Ledger"}
        subtitle={`${pod.client_id ?? "-"} - ${pod.name}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Back
        </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={handleDownloadStatement}
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Download Statement
          </button>
        </div>
        }
      />

      <WarehouseLedgerSummaryCard
        pod={pod}
        currentCycle={currentCycle}
        hasActiveCycle={hasActiveCycle}
        onRecordPayment={() => setOpenPay(true)}
        onAddTransaction={() => setOpenTx(true)}
        onRateChange={() => setOpenRate(true)}
        onCloseCycle={() => setOpenCloseConfirm(true)}
        onRenewCycle={handleRenewCycle}
        onEditClient={handleEditClient}
        closingCycle={closingCycle}
        isClosedView={isClosedView}
      />

      {!activeCycle && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-300">
          This cycle is closed. Ledger is read-only. Payments can still be
          recorded.
        </div>
      )}

      <WarehouseLedgerTotals
        currentDue={fmtINR(totals.currentDue)}
        currentDueNumber={totals.currentDue}
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
          deletingTxId={deletingTxId}
          updateDraft={updateDraft}
          onSaveRow={saveRow}
          onDeleteRow={deleteRow}
        />
      ) : (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-300">
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

      <EditClientModal
        open={openEditClient}
        podId={pod.id}
        defaultName={pod.name}
        defaultEmail={pod.email ?? ""}
        defaultContact={pod.contact}
        onClose={() => setOpenEditClient(false)}
        onDone={async () => {
          setOpenEditClient(false);
          await load();
        }}
      />

      <CloseCycleConfirmModal
        open={openCloseConfirm}
        closing={closingCycle}
        clientName={pod.name}
        onClose={() => setOpenCloseConfirm(false)}
        onConfirm={async () => {
          await handleCloseCycle();
          setOpenCloseConfirm(false);
        }}
      />
      </div>
    </div>
  );
}
