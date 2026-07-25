"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import type { WarehousePodSummary, WarehouseTxn } from "@/lib/warehouse/types";
import { money } from "@/lib/warehouse/billing";
import { Trash2 } from "lucide-react";
import {
  fetchPodTransactions,
  accrueWarehousePod,
} from "@/lib/warehouse/queries";
import EditPodModal from "./EditPodModal";
import { getErrorMessage } from "@/lib/errors";
import {
  buttonPrimary,
  buttonSecondary,
  fieldLabel,
  inputField,
  modalOverlay,
  modalPanel,
  modalTitle,
} from "@/components/shared/ui";

export default function PodDetailsModal({
  pod,
  onClose,
  onUpdated,
}: {
  pod: WarehousePodSummary;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [tx, setTx] = useState<WarehouseTxn[]>([]);
  const [loading, setLoading] = useState(true);

  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [payNote, setPayNote] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      await accrueWarehousePod(pod.id);
      const rows = await fetchPodTransactions(pod.id);
      setTx(rows);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load history");
      setTx([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod.id]);

  const addPayment = async () => {
    if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0)
      return;

    const run = async () => {
      const { error } = await supabase
        .from("warehouse_pod_transactions")
        .insert({
          pod_id: pod.id,
          type: "payment",
          amount: Number(payAmount),
          tx_date: payDate,
          note: payNote.trim() ? payNote.trim() : null,
        });
      if (error) throw error;
    };

    await toast.promise(run(), {
      loading: "Saving payment...",
      success: "Payment recorded ✅",
      error: "Failed to record payment",
    });

    setPayAmount("");
    setPayNote("");
    setPayDate(new Date().toISOString().split("T")[0]);

    await load();
    onUpdated();
  };

  const deleteTxn = async (id: string) => {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setDeletingId(id);

    const run = async () => {
      const { error } = await supabase
        .from("warehouse_pod_transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    };

    try {
      await toast.promise(run(), {
        loading: "Deleting...",
        success: "Deleted",
        error: "Failed to delete",
      });
      await load();
      onUpdated();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={modalOverlay}>
      <div className={`${modalPanel} max-h-[90vh] max-w-3xl overflow-y-auto p-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className={modalTitle}>{pod.name}</h3>
            <p className="text-sm text-fg-muted">
              {pod.contact} • {pod.email ?? "—"} • {pod.location_name ?? "—"}
            </p>
            <p className="text-xs text-fg-subtle">
              Next due: {pod.next_charge_date} • Rate: {money(Number(pod.rate))}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className={buttonSecondary}
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className={buttonSecondary}
            >
              Close
            </button>
          </div>
        </div>

        {/* Payment entry */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div>
            <label className={fieldLabel}>
              Amount paid
            </label>
            <input
              className={inputField}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
          <div>
            <label className={fieldLabel}>Date</label>
            <input
              className={inputField}
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addPayment}
              className={`${buttonPrimary} w-full`}
            >
              Add Payment
            </button>
          </div>
          <div className="md:col-span-3">
            <label className={fieldLabel}>
              Note (optional)
            </label>
            <input
              className={inputField}
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-fg-muted mb-2">
            Transaction history
          </h4>

          {loading ? (
            <p className="text-fg-muted">Loading...</p>
          ) : tx.length === 0 ? (
            <p className="text-fg-muted">No transactions.</p>
          ) : (
            <ul className="divide-y divide-edge max-h-90 overflow-auto pr-2">
              {tx.map((t) => (
                <li
                  key={t.id}
                  className="py-3 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium capitalize">{t.type}</p>
                    <p className="text-sm text-fg-muted">
                      {new Date(t.tx_date).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {t.note && (
                      <p className="text-sm text-fg-muted wrap-break-word">
                        {t.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          t.type === "payment"
                            ? "text-success"
                            : "text-accent"
                        }`}
                      >
                        {t.type === "payment" ? "-" : "+"}
                        {money(Number(t.amount))}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteTxn(t.id)}
                      disabled={deletingId === t.id}
                      className="shrink-0 inline-flex items-center rounded-lg border border-danger/30 bg-danger-soft px-2 py-1 text-xs font-medium text-danger-soft-fg transition-colors hover:border-danger/50 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deletingId === t.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {editOpen && (
          <EditPodModal
            podId={pod.id}
            initial={{
              name: pod.name,
              email: pod.email ?? "",
              contact: pod.contact,
              location: pod.location_name ?? "",
              rate: String(pod.rate),
              durationMonths: String(pod.duration_months),
              billingInterval: pod.billing_interval,
              modeOfPayment: pod.mode_of_payment ?? "",
            }}
            onClose={() => setEditOpen(false)}
            onSaved={async () => {
              setEditOpen(false);
              await load();
              onUpdated();
            }}
          />
        )}
      </div>
    </div>
  );
}
