"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPodCycles } from "@/lib/warehouse/pods";
import { fetchCycleTransactions } from "@/lib/warehouse/ledger";
import type { WarehouseTxn, WarehouseCycle } from "@/lib/warehouse/types";

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

  return dt.toLocaleDateString("en-IN");
}

function getDebitTotal(t: WarehouseTxn) {
  const amt = Number(t.amount) || 0;
  if (amt <= 0) return 0;

  const gstRate = Number(t.gst_rate ?? 0) || 0;
  return round2(amt + (amt * gstRate) / 100);
}

function getCreditTotal(t: WarehouseTxn) {
  const amt = Number(t.amount) || 0;
  if (amt >= 0) return 0;
  return round2(Math.abs(amt));
}

export default function WarehouseStatement() {
  const [tx, setTx] = useState<WarehouseTxn[]>([]);
  const [cycle, setCycle] = useState<WarehouseCycle | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const podId = params.get("podId");

    if (!podId) return;

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

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;

    for (const t of tx) {
      debit += getDebitTotal(t);
      credit += getCreditTotal(t);
    }

    return {
      debit: round2(debit),
      credit: round2(credit),
      due: round2(debit - credit),
    };
  }, [tx]);

  return (
    <div className="min-h-screen bg-white p-10 text-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-start justify-between">
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

        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-right">Debit (incl. GST)</th>
              <th className="p-2 text-right">Credit</th>
            </tr>
          </thead>

          <tbody>
            {tx.map((t) => {
              const debit = getDebitTotal(t);
              const credit = getCreditTotal(t);

              return (
                <tr key={t.id} className="border-t">
                  <td className="p-2">{fmtDate(t.tx_date)}</td>
                  <td className="p-2">{t.title}</td>
                  <td className="p-2 text-right">
                    {debit > 0 ? fmtINR(debit) : "—"}
                  </td>
                  <td className="p-2 text-right">
                    {credit > 0 ? fmtINR(credit) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-6 space-y-1 text-right">
          <div>Total Debit: {fmtINR(totals.debit)}</div>
          <div>Total Credit: {fmtINR(totals.credit)}</div>
          <div className="font-bold">Balance Due: {fmtINR(totals.due)}</div>
        </div>

        <div className="mt-10 text-xs text-gray-500">
          Generated on {new Date().toLocaleDateString("en-IN")}
        </div>
      </div>
    </div>
  );
}
