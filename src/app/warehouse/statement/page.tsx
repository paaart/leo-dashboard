"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPodCycles } from "@/lib/warehouse/pods";
import { fetchCycleTransactions } from "@/lib/warehouse/ledger";
import type { WarehouseTxn, WarehouseCycle } from "@/lib/warehouse/types";
import {
  fmtINR,
  fmtDate,
  toLedgerVMRows,
  computeLedgerTotals,
} from "@/lib/warehouse/ledgerMath";

type StatementPodDetails = {
  podId: string;
  name: string;
  clientId: string;
  company: string;
  contact: string;
  email: string;
  location: string;
  billingStartDate: string;
  billingInterval: string;
};

export default function WarehouseStatement() {
  const [tx, setTx] = useState<WarehouseTxn[]>([]);
  const [cycle, setCycle] = useState<WarehouseCycle | null>(null);
  const [pod, setPod] = useState<StatementPodDetails | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const podId = params.get("podId");

    if (!podId) return;

    setPod({
      podId,
      name: params.get("name") ?? "",
      clientId: params.get("clientId") ?? "",
      company: params.get("company") ?? "",
      contact: params.get("contact") ?? "",
      email: params.get("email") ?? "",
      location: params.get("location") ?? "",
      billingStartDate: params.get("billingStartDate") ?? "",
      billingInterval: params.get("billingInterval") ?? "",
    });

    async function load(validPodId: string) {
      const cycles = await fetchPodCycles(validPodId);
      const latest = cycles[0] ?? null;
      setCycle(latest);

      if (latest) {
        const rows = await fetchCycleTransactions(latest.id);
        setTx(rows);
      } else {
        setTx([]);
      }
    }

    void load(podId);
  }, []);

  const vmRows = useMemo(() => toLedgerVMRows(tx), [tx]);
  const totals = useMemo(() => computeLedgerTotals(vmRows), [vmRows]);

  return (
    <div className="min-h-screen bg-white p-10 text-black">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="mb-2 text-2xl font-bold">
              Warehouse Ledger Statement
            </h1>

            <div className="space-y-1 text-sm">
              <div>Cycle Start: {fmtDate(cycle?.cycle_start)}</div>
              <div>Cycle End: {fmtDate(cycle?.cycle_end)}</div>
              <div>Status: {cycle?.status ?? "—"}</div>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Print / Save PDF
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 border p-4 text-sm md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-base font-semibold">Client Details</div>
            <div>Name: {pod?.name || "—"}</div>
            <div>Client ID: {pod?.clientId || "—"}</div>
            <div>Contact: {pod?.contact || "—"}</div>
            <div>Email: {pod?.email || "—"}</div>
          </div>

          <div className="space-y-1">
            <div className="text-base font-semibold">Company Details</div>
            <div>Company: {pod?.company || "—"}</div>
            <div>Location: {pod?.location || "—"}</div>
            <div>Billing Start: {fmtDate(pod?.billingStartDate)}</div>
            <div>Billing Interval: {pod?.billingInterval || "—"}</div>
          </div>
        </div>

        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Note</th>
              <th className="p-2 text-right">Debit (incl. GST)</th>
              <th className="p-2 text-right">Credit</th>
            </tr>
          </thead>

          <tbody>
            {vmRows.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2">{fmtDate(t.tx_date)}</td>
                <td className="p-2">{t.title}</td>
                <td className="p-2">{t.note ?? "—"}</td>
                <td className="p-2 text-right">
                  {t._isDebit ? fmtINR(t._debitTotal) : "—"}
                </td>
                <td className="p-2 text-right">
                  {t._isCredit ? fmtINR(t._creditAmount) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 space-y-1 text-right">
          <div>Total Debit: {fmtINR(totals.totalDebit)}</div>
          <div>Total Credit: {fmtINR(totals.totalCredit)}</div>
          <div className="font-bold">
            Balance Due: {fmtINR(totals.currentDue)}
          </div>
        </div>

        <div className="mt-10 text-xs text-gray-500">
          Generated on {new Date().toLocaleDateString("en-IN")}
        </div>
      </div>
    </div>
  );
}
