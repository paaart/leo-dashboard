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
      <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
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
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Storage"
          title="Warehouse Management"
          subtitle="Manage warehouse clients, PODs, billing, payments, and storage ledgers."
        />

        <SectionCard
          title="Billing / Auto Charges"
          description="Review renewals due this month and extend cycles without changing charge logic."
          action={
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-edge bg-surface px-4 text-sm font-medium text-fg shadow-card transition hover:bg-surface-2"
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
            <div className="overflow-x-auto rounded-xl border border-edge bg-surface shadow-card">
              <table className="min-w-245 w-full text-sm">
                <thead className="bg-surface-2 text-fg-muted">
                  <tr>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Client
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Contact
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Location
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      End Date
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-right font-semibold">
                      Monthly Rate
                    </th>
                    <th className="border-b border-edge px-4 py-3 text-left font-semibold">
                      Insurance
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-edge">
                  {rows.map((r) => (
                    <tr
                      key={r.pod_id}
                      className="cursor-pointer bg-surface transition-colors hover:bg-surface-2/60"
                      onClick={() => setSelected(r)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-fg">
                          {r.name}
                        </div>
                        <div className="text-xs text-fg-muted">
                          {r.client_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-fg-muted">
                        {r.contact}
                      </td>
                      <td className="px-4 py-3 text-fg-muted">
                        {r.location_name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-fg-muted">
                        {new Date(r.end_date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-accent">
                        {formatCurrency(Number(r.rate))}
                      </td>
                      <td className="px-4 py-3">
                        {r.insurance_provider === "leo" ? (
                          <span className="inline-flex rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-soft-fg">
                            Leo (
                            {formatCurrency(Number(r.insurance_value ?? 0))})
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
