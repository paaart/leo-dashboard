"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

export default function WarehouseRateChangeModal({
  open,
  onClose,
  oldRate,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  oldRate: number;
  onSubmit: (v: {
    newRate: number;
    effectiveDate: string; // YYYY-MM-DD
    extraDays: number; // default 15
    gstRate: number; // default 18
    addExtraChargeNow: boolean;
    note?: string | null;
  }) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const [newRate, setNewRate] = useState(String(oldRate));
  const [effectiveDate, setEffectiveDate] = useState(today);

  const [extraDays, setExtraDays] = useState("15");
  const [gstRate, setGstRate] = useState("18");
  const [addExtraChargeNow, setAddExtraChargeNow] = useState(true);

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const isIncrease = useMemo(() => {
    const nr = Number(newRate);
    return Number.isFinite(nr) && nr > oldRate;
  }, [newRate, oldRate]);

  // Auto-toggle policy: if it's NOT an increase, extra charge should be off.
  // (User can’t accidentally charge extra on decrease)
  const effectiveAddExtra = isIncrease ? addExtraChargeNow : false;

  const inputClass =
    "w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white";

  if (!open) return null;

  const save = async () => {
    const nr = Number(newRate);
    if (!nr || Number.isNaN(nr) || nr <= 0)
      return toast.error("Enter valid new rate");

    const ed = Number(extraDays);
    if (Number.isNaN(ed) || ed < 0)
      return toast.error("Enter valid extra days");

    const gr = Number(gstRate);
    if (Number.isNaN(gr) || gr < 0) return toast.error("Enter valid GST");

    setSaving(true);
    try {
      await toast.promise(
        onSubmit({
          newRate: nr,
          effectiveDate,
          extraDays: ed,
          gstRate: gr,
          addExtraChargeNow: effectiveAddExtra,
          note: note.trim() ? note.trim() : null,
        }),
        {
          loading: "Applying changes...",
          success: "Rate updated ✅",
          error: (e) => getErrorMessage(e) || "Failed to update rate",
        }
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-[#1f2933]">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Change Monthly Rate</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Old rate:{" "}
            <span className="font-semibold">₹{Number(oldRate).toFixed(0)}</span>
          </p>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Rule: increases can add a one-time partial charge now. Decreases
            apply from next cycle (no refund).
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
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Effective date</label>
            <input
              className={inputClass}
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                Extra charge now (only for increases)
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={effectiveAddExtra}
                  disabled={!isIncrease}
                  onChange={(e) => setAddExtraChargeNow(e.target.checked)}
                />
                Enabled
              </label>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 text-sm">Extra days</label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={extraDays}
                  disabled={!isIncrease || !effectiveAddExtra}
                  onChange={(e) => setExtraDays(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-1 text-sm">GST %</label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={gstRate}
                  disabled={!isIncrease || !effectiveAddExtra}
                  onChange={(e) => setGstRate(e.target.value)}
                />
              </div>
            </div>

            {!isIncrease ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Since this is a decrease, we won’t charge anything now. New rate
                will apply to future auto-charges.
              </p>
            ) : null}
          </div>

          <div>
            <label className="block mb-1 font-medium">Note (optional)</label>
            <input
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Added 3 boxes"
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
            {saving ? "Saving..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
