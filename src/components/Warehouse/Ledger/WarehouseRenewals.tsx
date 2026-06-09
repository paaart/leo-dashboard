"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { fetchRenewalsThisMonth } from "@/lib/warehouse/queries";
import type { WarehouseRenewalRow } from "@/lib/warehouse/types";
import WarehouseRenewModal from "./WarehouseRenewModal";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";
import WarehouseSummaryCards from "../WarehouseSummaryCards";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function WarehouseRenewals() {
  const [rows, setRows] = useState<WarehouseRenewalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WarehouseRenewalRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRenewalsThisMonth();
      setRows(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load renewals");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader
            eyebrow="Storage"
            title="Warehouse Management"
            subtitle="Manage warehouse clients, PODs, billing, payments, and storage ledgers."
          />
          <LoadingState label="Loading renewals" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Storage"
          title="Warehouse Management"
          subtitle="Manage warehouse clients, PODs, billing, payments, and storage ledgers."
        />

        <WarehouseSummaryCards />

        <SectionCard
          title="Billing / Auto Charges"
          description="Review renewals due this month and extend cycles without changing charge logic."
          action={
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Refresh
            </button>
          }
        >
          {rows.length === 0 ? (
            <EmptyState
              title="No renewals due"
              description="Warehouse renewals due this month will appear here."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
              <tr>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                  Client
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                  Contact
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                  Location
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                  End Date
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800">
                  Monthly Rate
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                  Insurance
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {rows.map((r) => (
                <tr
                  key={r.pod_id}
                  className="cursor-pointer bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                  onClick={() => setSelected(r)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-950 dark:text-gray-50">
                      {r.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {r.client_id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {r.contact}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {r.location_name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {new Date(r.end_date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-blue-700 dark:text-blue-300">
                    {formatCurrency(Number(r.rate))}
                  </td>
                  <td className="px-4 py-3">
                    {r.insurance_provider === "leo" ? (
                      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                        Leo ({formatCurrency(Number(r.insurance_value ?? 0))})
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {selected && (
        <WarehouseRenewModal
          open={!!selected}
          podId={selected.pod_id}
          clientId={selected.client_id}
          clientName={selected.name}
          defaultRate={Number(selected.rate)}
          defaultDurationMonths={Number(selected.duration_months)}
          defaultInsuranceProvider={selected.insurance_provider}
          defaultInsuranceValue={Number(selected.insurance_value ?? 0)}
          defaultInsuranceIdv={Number(selected.insurance_idv ?? 0)}
          endDate={selected.end_date}
          onClose={() => setSelected(null)}
          onDone={async () => {
            setSelected(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
