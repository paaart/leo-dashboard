"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { fetchRenewalsThisMonth } from "@/lib/warehouse/queries";
import type { WarehouseRenewalRow } from "@/lib/warehouse/types";
import { supabase } from "@/lib/supabaseClient";

type InsuranceProvider = "none" | "leo";

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
    <div className="mx-auto p-8 bg-white dark:bg-[#23272f] rounded shadow min-h-screen">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Renewals (This Month)</h2>
        <button
          onClick={() => void load()}
          className="text-sm bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded hover:opacity-90"
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
          <table className="min-w-[1050px] w-full border border-gray-200 dark:border-gray-700 rounded">
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
        <RenewModal
          row={selected}
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

function RenewModal({
  row,
  onClose,
  onDone,
}: {
  row: WarehouseRenewalRow;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [rate, setRate] = useState(String(row.rate));
  const [durationMonths, setDurationMonths] = useState(
    String(row.duration_months)
  );

  const [insuranceProvider, setInsuranceProvider] = useState<InsuranceProvider>(
    (row.insurance_provider ?? "none") as InsuranceProvider
  );
  const [insuranceValue, setInsuranceValue] = useState(
    String(row.insurance_value ?? 0)
  );

  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white";

  const save = async () => {
    const newRate = Number(rate);
    const newDur = Number(durationMonths);

    if (!newRate || Number.isNaN(newRate) || newRate <= 0) {
      toast.error("Enter valid rate");
      return;
    }
    if (!newDur || Number.isNaN(newDur) || newDur < 1) {
      toast.error("Enter valid duration");
      return;
    }

    const insVal = insuranceProvider === "leo" ? Number(insuranceValue) : 0;

    if (insuranceProvider === "leo" && (Number.isNaN(insVal) || insVal < 0)) {
      toast.error("Enter valid insurance value");
      return;
    }

    setSaving(true);

    const run = async () => {
      // IMPORTANT: pick correct overload (you have 2 warehouse_renew_pod functions)
      // Always pass p_cycle_start so Postgres doesn't get confused.
      const cycleStart = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const { error } = await supabase.rpc("warehouse_renew_pod", {
        p_pod_id: row.pod_id,
        p_new_rate: newRate,
        p_new_duration_months: newDur,
        p_new_insurance_provider: insuranceProvider,
        p_new_insurance_value: insVal,
        p_cycle_start: cycleStart,
      });

      if (error) throw error;
    };

    try {
      await toast.promise(run(), {
        loading: "Renewing...",
        success: "Renewed ✅",
        error: (e) => getErrorMessage(e) || "Failed to renew",
      });
      await onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-[#1f2933]">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Renew Client</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {row.client_id} — {row.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ends on {new Date(row.end_date).toLocaleDateString("en-IN")}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block mb-1 font-medium">
              New monthly rate (₹)
            </label>
            <input
              className={inputClass}
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              New duration (months)
            </label>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Insurance</label>
            <select
              className={inputClass}
              value={insuranceProvider}
              onChange={(e) => {
                const v = e.target.value as InsuranceProvider;
                setInsuranceProvider(v);
                if (v !== "leo") setInsuranceValue("0");
              }}
            >
              <option value="none">No (or external)</option>
              <option value="leo">Leo Insurance</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Insurance value (₹)
            </label>
            <input
              className={inputClass}
              type="number"
              value={insuranceValue}
              disabled={insuranceProvider !== "leo"}
              onChange={(e) => setInsuranceValue(e.target.value)}
            />
            {insuranceProvider !== "leo" && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Only Leo insurance can have a value.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
