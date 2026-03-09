"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { fetchRenewalsThisMonth } from "@/lib/warehouse/queries";
import type { WarehouseRenewalRow } from "@/lib/warehouse/types";
import WarehouseRenewModal from "./WarehouseRenewModal";

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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#23272f]">
        <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen rounded bg-white p-8 shadow dark:bg-[#23272f]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Renewals (This Month)</h2>
        <button
          onClick={() => void load()}
          className="rounded bg-gray-200 px-3 py-1 text-sm hover:opacity-90 dark:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">
          No renewals due this month.
        </p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-262.5 w-full rounded border border-gray-200 dark:border-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="p-2 text-left">Client ID</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Contact</th>
                <th className="p-2 text-left">Location</th>
                <th className="p-2 text-left">End Date</th>
                <th className="p-2 text-right">Monthly Rate</th>
                <th className="p-2 text-left">Insurance</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((r) => (
                <tr
                  key={r.pod_id}
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setSelected(r)}
                >
                  <td className="p-2 font-semibold">{r.client_id}</td>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.contact}</td>
                  <td className="p-2">{r.location_name ?? "—"}</td>
                  <td className="p-2">
                    {new Date(r.end_date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="p-2 text-right">
                    ₹{Number(r.rate).toFixed(0)}
                  </td>
                  <td className="p-2">
                    {r.insurance_provider === "leo" ? (
                      <span className="font-medium">
                        Leo (₹{Number(r.insurance_value ?? 0).toFixed(0)})
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <WarehouseRenewModal
          open={Boolean(selected)}
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
