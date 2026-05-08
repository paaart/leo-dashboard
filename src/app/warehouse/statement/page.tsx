"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { fetchPodCycles } from "@/lib/warehouse/pods";
import { fetchCycleTransactions } from "@/lib/warehouse/ledger";
import type { WarehouseTxn, WarehouseCycle } from "@/lib/warehouse/types";
import {
  fmtINR,
  fmtDate,
  toLedgerVMRows,
  computeLedgerTotals,
} from "@/lib/warehouse/ledgerMath";

import { displayTransactionTitle } from "@/lib/utils";

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

const statementFootnotes = [
  "Monthly Storage Charge is billed from the displayed transaction date and applies to the upcoming billing period, not the previous month.",
  "Payments and credits are adjusted against the total outstanding balance shown in this statement.",
  "This statement is generated from the warehouse ledger records available at the time of printing.",
];

export default function WarehouseStatement() {
  const [tx, setTx] = useState<WarehouseTxn[]>([]);
  const [cycle, setCycle] = useState<WarehouseCycle | null>(null);
  const [pod, setPod] = useState<StatementPodDetails | null>(null);
  const [downloadMode, setDownloadMode] = useState<"internal" | "client">(
    "internal"
  );

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

  const handlePrint = useCallback(() => {
    document.body.dataset.statementMode = downloadMode;

    requestAnimationFrame(() => {
      window.print();

      setTimeout(() => {
        delete document.body.dataset.statementMode;
      }, 300);
    });
  }, [downloadMode]);

  useEffect(() => {
    const styleId = "warehouse-statement-print-mode-style";

    let style = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!style) {
      style = document.createElement("style");
      style.id = styleId;

      style.innerHTML = `
        @media print {
          body[data-statement-mode="client"] .internal-only {
            display: none !important;
          }
        }
      `;

      document.head.appendChild(style);
    }

    return () => {
      style?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white p-10 text-black">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="mb-2 text-2xl font-bold">
              Warehouse Ledger Statement
            </h1>

            <div className="mb-3 inline-flex rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              Statement Preview
            </div>

            <div className="space-y-1 text-sm text-gray-700">
              <div>
                Storage start date:{" "}
                {fmtDate(pod?.billingStartDate ?? cycle?.cycle_start)}
              </div>
              <div>Status: {cycle?.status ?? "—"}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            <div className="flex overflow-hidden rounded border border-gray-300 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setDownloadMode("client")}
                className={[
                  "px-4 py-2 text-sm font-medium transition",
                  downloadMode === "client"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-black hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700",
                ].join(" ")}
              >
                Client
              </button>

              <button
                type="button"
                onClick={() => setDownloadMode("internal")}
                className={[
                  "border-l border-gray-300 px-4 py-2 text-sm font-medium transition dark:border-gray-700",
                  downloadMode === "internal"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700",
                ].join(" ")}
              >
                Internal
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-base font-semibold">Client Details</div>
            <div>Name: {pod?.name || "—"}</div>
            <div>Client ID: {pod?.clientId || "—"}</div>
            <div>Contact: {pod?.contact || "—"}</div>
            <div>Email: {pod?.email || "—"}</div>
          </div>

          <div className="space-y-1">
            <div className="internal-only text-base font-semibold">
              Company Details
            </div>
            <div className="internal-only">Company: {pod?.company || "—"}</div>
            <div>Location: {pod?.location || "—"}</div>
            <div>Storage Start: {fmtDate(pod?.billingStartDate)}</div>
            <div>Billing Interval: {pod?.billingInterval || "—"}</div>
          </div>
        </div>

        <table className="w-full overflow-hidden rounded-lg border border-gray-300 text-sm">
          <thead className="bg-gray-100 text-gray-900">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Title</th>

              <th className="internal-only p-2 text-left">Note</th>

              <th className="p-2 text-right">Debit (incl. GST)</th>
              <th className="p-2 text-right">Credit</th>
            </tr>
          </thead>

          <tbody>
            {vmRows.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2">{fmtDate(t.tx_date)}</td>
                <td className="p-2">{displayTransactionTitle(t.title)}</td>
                <td className="internal-only p-2">{t.note ?? "—"}</td>

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

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span>Total Debit</span>
              <span className="font-medium">{fmtINR(totals.totalDebit)}</span>
            </div>

            <div className="mt-1 flex justify-between gap-4">
              <span>Total Credit</span>
              <span className="font-medium">{fmtINR(totals.totalCredit)}</span>
            </div>

            <div className="mt-3 flex justify-between gap-4 border-t border-gray-300 pt-3 text-base font-bold">
              <span>Balance Due</span>
              <span>{fmtINR(totals.currentDue)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-gray-300 bg-gray-50 p-4 text-xs text-gray-700">
          <div className="mb-2 font-semibold uppercase tracking-wide text-gray-900">
            Notes
          </div>

          <ol className="list-decimal space-y-1 pl-4">
            {statementFootnotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ol>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Generated on {new Date().toLocaleDateString("en-IN")}
        </div>
      </div>
    </div>
  );
}
