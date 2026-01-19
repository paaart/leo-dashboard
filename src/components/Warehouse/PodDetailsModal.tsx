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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl dark:bg-[#1f2933]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{pod.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              {pod.contact} • {pod.email ?? "—"} • {pod.location_name ?? "—"}
            </p>
            <p className="text-xs text-gray-400">
              Next due: {pod.next_charge_date} • Rate: {money(Number(pod.rate))}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>

        {/* Payment entry */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Amount paid
            </label>
            <input
              className="w-full p-2 border rounded bg-white dark:bg-gray-800"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Date</label>
            <input
              className="w-full p-2 border rounded bg-white dark:bg-gray-800"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addPayment}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add Payment
            </button>
          </div>
          <div className="md:col-span-3">
            <label className="block mb-1 text-sm font-medium">
              Note (optional)
            </label>
            <input
              className="w-full p-2 border rounded bg-white dark:bg-gray-800"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
            Transaction history
          </h4>

          {loading ? (
            <p className="text-gray-600 dark:text-gray-300">Loading...</p>
          ) : tx.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">No transactions.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-90 overflow-auto pr-2">
              {tx.map((t) => (
                <li
                  key={t.id}
                  className="py-3 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium capitalize">{t.type}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(t.tx_date).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {t.note && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 wrap-break-word">
                        {t.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          t.type === "payment"
                            ? "text-green-600 dark:text-green-400"
                            : "text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {t.type === "payment" ? "-" : "+"}
                        {money(Number(t.amount))}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteTxn(t.id)}
                      disabled={deletingId === t.id}
                      className="shrink-0 inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 text-red-600 disabled:opacity-50"
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
