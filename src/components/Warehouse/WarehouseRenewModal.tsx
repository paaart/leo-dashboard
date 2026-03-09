"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import type { InsuranceProvider } from "@/lib/warehouse/types";
import { supabase } from "@/lib/supabaseClient";

type WarehouseRenewModalProps = {
  open: boolean;
  podId: string;
  clientId: string;
  clientName: string;
  defaultRate: number;
  defaultDurationMonths: number;
  defaultInsuranceProvider: InsuranceProvider;
  defaultInsuranceValue: number;
  defaultInsuranceIdv?: number | null;
  endDate?: string | null;
  onClose: () => void;
  onDone: () => Promise<void> | void;
};

export default function WarehouseRenewModal({
  open,
  podId,
  clientId,
  clientName,
  defaultRate,
  defaultDurationMonths,
  defaultInsuranceProvider,
  defaultInsuranceValue,
  defaultInsuranceIdv,
  endDate,
  onClose,
  onDone,
}: WarehouseRenewModalProps) {
  const [rate, setRate] = useState(String(defaultRate));
  const [durationMonths, setDurationMonths] = useState(
    String(defaultDurationMonths)
  );
  const [insuranceProvider, setInsuranceProvider] = useState<InsuranceProvider>(
    defaultInsuranceProvider ?? "none"
  );
  const [insuranceValue, setInsuranceValue] = useState(
    String(defaultInsuranceValue ?? 0)
  );
  const [insuranceIdv, setInsuranceIdv] = useState(
    String(defaultInsuranceIdv ?? 0)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setRate(String(defaultRate));
    setDurationMonths(String(defaultDurationMonths));
    setInsuranceProvider(defaultInsuranceProvider ?? "none");
    setInsuranceValue(String(defaultInsuranceValue ?? 0));
    setInsuranceIdv(String(defaultInsuranceIdv ?? 0));
  }, [
    open,
    defaultRate,
    defaultDurationMonths,
    defaultInsuranceProvider,
    defaultInsuranceValue,
    defaultInsuranceIdv,
  ]);

  if (!open) return null;

  const inputClass =
    "w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

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
    const idv = insuranceProvider === "leo" ? Number(insuranceIdv) : 0;

    if (insuranceProvider === "leo" && (Number.isNaN(insVal) || insVal < 0)) {
      toast.error("Enter valid insurance value");
      return;
    }

    if (insuranceProvider === "leo" && (Number.isNaN(idv) || idv < 0)) {
      toast.error("Enter valid IDV");
      return;
    }

    setSaving(true);

    const run = async () => {
      const { error } = await supabase.rpc("warehouse_renew_pod", {
        p_pod_id: podId,
        p_new_rate: newRate,
        p_new_duration_months: newDur,
        p_new_insurance_provider: insuranceProvider,
        p_new_insurance_value: insVal,
        p_new_insurance_idv: idv,
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
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Renew Client</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {clientId} — {clientName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ends on{" "}
            {endDate ? new Date(endDate).toLocaleDateString("en-IN") : "—"}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-medium">
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
            <label className="mb-1 block font-medium">
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
            <label className="mb-1 block font-medium">Insurance</label>
            <select
              className={inputClass}
              value={insuranceProvider}
              onChange={(e) => {
                const v = e.target.value as InsuranceProvider;
                setInsuranceProvider(v);

                if (v !== "leo") {
                  setInsuranceValue("0");
                  setInsuranceIdv("0");
                }
              }}
            >
              <option value="none">No (or external)</option>
              <option value="leo">Leo Insurance</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium">IDV (₹)</label>
            <input
              className={inputClass}
              type="number"
              value={insuranceIdv}
              disabled={insuranceProvider !== "leo"}
              onChange={(e) => setInsuranceIdv(e.target.value)}
            />
            {insuranceProvider !== "leo" && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                IDV applies only when Leo insurance is selected.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-medium">
              Insurance value (₹)
            </label>
            <input
              className={inputClass}
              type="number"
              value={insuranceValue}
              disabled={insuranceProvider !== "leo"}
              onChange={(e) => setInsuranceValue(e.target.value)}
            />
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
