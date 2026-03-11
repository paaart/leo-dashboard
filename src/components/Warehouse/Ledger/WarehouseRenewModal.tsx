"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import type { InsuranceProvider } from "@/lib/warehouse/types";
import { renewWarehousePod } from "@/lib/warehouse/renew";

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

function parseNonNegativeNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

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
    const newDurationMonths = Number(durationMonths);

    if (!Number.isFinite(newRate) || newRate <= 0) {
      toast.error("Enter a valid monthly rate");
      return;
    }

    if (!Number.isFinite(newDurationMonths) || newDurationMonths < 1) {
      toast.error("Enter a valid duration");
      return;
    }

    const newInsuranceValue =
      insuranceProvider === "leo" ? parseNonNegativeNumber(insuranceValue) : 0;

    const newInsuranceIdv =
      insuranceProvider === "leo" ? parseNonNegativeNumber(insuranceIdv) : 0;

    if (insuranceProvider === "leo" && Number.isNaN(newInsuranceValue)) {
      toast.error("Enter a valid insurance value");
      return;
    }

    if (insuranceProvider === "leo" && Number.isNaN(newInsuranceIdv)) {
      toast.error("Enter a valid IDV");
      return;
    }

    setSaving(true);

    try {
      await toast.promise(
        renewWarehousePod({
          podId,
          newRate,
          newDurationMonths,
          newInsuranceProvider: insuranceProvider,
          newInsuranceValue,
          newInsuranceIdv,
        }),
        {
          loading: "Renewing...",
          success: "Renewed ✅",
          error: (e) => getErrorMessage(e) || "Failed to renew",
        }
      );

      await onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
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
              min={0}
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
              min={0}
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
              min={0}
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
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-70 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
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
