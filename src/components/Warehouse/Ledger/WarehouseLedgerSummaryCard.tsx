"use client";

import type {
  WarehousePodSummary,
  WarehouseCycle,
} from "@/lib/warehouse/types";
import { fmtDate, fmtINR } from "@/lib/warehouse/ledgerMath";

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-35">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
        {value || "—"}
      </div>
    </div>
  );
}

export default function WarehouseLedgerSummaryCard({
  pod,
  currentCycle,
  hasActiveCycle,
  onRecordPayment,
  onAddTransaction,
  onRateChange,
  onCloseCycle,
  onRenewCycle,
  onEditClient,
  closingCycle,
  isClosedView,
}: {
  pod: WarehousePodSummary;
  currentCycle: WarehouseCycle | null;
  hasActiveCycle: boolean;
  onRecordPayment: () => void;
  onAddTransaction: () => void;
  onRateChange: () => void;
  onCloseCycle: () => void;
  onRenewCycle: () => void;
  onEditClient: () => void;
  closingCycle: boolean;
  isClosedView: boolean;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-[#1f2933]">
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {pod.name}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Client ID: {pod.client_id ?? "—"}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <LabelValue label="Contact" value={pod.contact || "—"} />
              <LabelValue label="Email" value={pod.email ?? "—"} />
              <LabelValue label="Company" value={pod.company_name ?? "—"} />
              <LabelValue label="Location" value={pod.location_name ?? "—"} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 xl:min-w-90">
            <LabelValue
              label="Status"
              value={
                hasActiveCycle ? "Active Cycle" : "Closed / No Active Cycle"
              }
            />
            <LabelValue
              label="Cycle Start"
              value={fmtDate(
                currentCycle?.cycle_start ?? pod.billing_start_date
              )}
            />
            <LabelValue
              label="Renewal Due"
              value={fmtDate(currentCycle?.cycle_end ?? null)}
            />
            <LabelValue
              label="Next Charge"
              value={fmtDate(pod.next_charge_date)}
            />
            {/* <LabelValue
              label="Next Payment"
              value={fmtDate(pod.next_payment_date)}
            /> */}
            <LabelValue
              label="Billing Interval"
              value={pod.billing_interval.replace("_", " ")}
            />
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          <LabelValue label="Rate" value={fmtINR(Number(pod.rate))} />
          <LabelValue
            label="Duration"
            value={`${Number(pod.duration_months ?? 0)} month(s)`}
          />
          <LabelValue
            label="Insurance"
            value={pod.insurance_provider === "leo" ? "Leo" : "None / External"}
          />
          <LabelValue
            label="Insurance Value"
            value={fmtINR(Number(pod.insurance_value ?? 0))}
          />
          <LabelValue
            label="IDV"
            value={fmtINR(Number(pod.insurance_idv ?? 0))}
          />
          <LabelValue
            label="Mode of Payment"
            value={pod.mode_of_payment ?? "—"}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-5 py-4">
        <button
          onClick={onRecordPayment}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Record Payment
        </button>

        {!isClosedView && (
          <>
            <button
              onClick={onAddTransaction}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
            >
              Add Transaction
            </button>

            <button
              onClick={onRateChange}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Change Rate / Items
            </button>

            <button
              onClick={onCloseCycle}
              disabled={closingCycle}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70"
            >
              {closingCycle ? "Closing..." : "Close Cycle"}
            </button>
            <button
              onClick={onRenewCycle}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Renew Cycle
            </button>
          </>
        )}

        <button
          onClick={onEditClient}
          className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-black dark:bg-gray-600 dark:hover:bg-gray-500"
        >
          Edit Client
        </button>
      </div>
    </section>
  );
}
