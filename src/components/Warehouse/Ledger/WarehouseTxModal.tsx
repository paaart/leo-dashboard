"use client";

import { useEffect, useState } from "react";

type BaseProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (v: {
    amount: number;
    txDate: string;
    title: string;
    note: string;
    gstRate?: number;
    type?: "charge" | "adjustment";
  }) => Promise<void>;
  kind: "transaction" | "payment";
};

function clampNumberString(s: string) {
  if (s.trim() === "") return "";
  const cleaned = s.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

export default function WarehouseTxModal(props: BaseProps) {
  const { open, title, onClose, onSubmit, kind } = props;

  const [amount, setAmount] = useState("");
  const [txDate, setTxDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [rowTitle, setRowTitle] = useState(
    kind === "payment" ? "Payment" : "Manual charge"
  );
  const [note, setNote] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [type, setType] = useState<"charge" | "adjustment">("charge");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setTxDate(new Date().toISOString().slice(0, 10));
    setRowTitle(kind === "payment" ? "Payment" : "Manual charge");
    setNote("");
    setGstRate("18");
    setType("charge");
  }, [open, kind]);

  if (!open) return null;

  const input =
    "w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-fg";

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || Number.isNaN(amt) || amt <= 0) return;

    const gst = kind === "payment" ? 0 : Number(gstRate || 0);

    setSaving(true);
    try {
      await onSubmit({
        amount: amt,
        txDate,
        title: rowTitle,
        note,
        gstRate: gst,
        type,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = (() => {
    const amt = Number(amount);
    return amt > 0 && !Number.isNaN(amt) && !!txDate;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-surface border border-edge shadow-overlay">
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
          <div className="font-semibold text-fg">
            {title}
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-sm text-fg-muted hover:underline disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
          {kind === "transaction" ? (
            <div>
              <label className="text-xs text-fg-muted">
                Type
              </label>
              <select
                className={input}
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "charge" | "adjustment")
                }
              >
                <option value="charge">Charge</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-fg-muted">
                Date
              </label>
              <input
                className={input}
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-fg-muted">
                Amount (₹)
              </label>
              <input
                className={input}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(clampNumberString(e.target.value))}
                placeholder="e.g. 2500"
              />
            </div>
          </div>

          {kind === "transaction" ? (
            <div>
              <label className="text-xs text-fg-muted">
                GST %
              </label>
              <input
                className={input}
                inputMode="decimal"
                value={gstRate}
                onChange={(e) => setGstRate(clampNumberString(e.target.value))}
                placeholder="18"
              />
            </div>
          ) : null}

          <div>
            <label className="text-xs text-fg-muted">
              Title
            </label>
            <input
              className={input}
              value={rowTitle}
              onChange={(e) => setRowTitle(e.target.value)}
              placeholder="Title"
            />
          </div>

          <div>
            <label className="text-xs text-fg-muted">
              Note (optional)
            </label>
            <input
              className={input}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any note..."
            />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-edge flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-edge bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
