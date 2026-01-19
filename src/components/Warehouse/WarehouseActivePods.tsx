"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import {
  accrueWarehouseCharges,
  listWarehousePods,
  type WarehousePodSummary,
} from "@/lib/warehouse";
import WarehousePodHistoryView from "./WarehousePodLedger";

function rowBandClass(b: "green" | "yellow" | "red") {
  if (b === "red")
    return "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30";
  if (b === "yellow")
    return "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30";
  return "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30";
}

export default function WarehouseActivePods() {
  const [rows, setRows] = useState<WarehousePodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<WarehousePodSummary | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      await accrueWarehouseCharges(); // keep totals fresh at view time
      const data = await listWarehousePods();
      setRows(data); // includes all, even total_due = 0 (as you wanted)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      return (
        r.name.toLowerCase().includes(s) ||
        r.contact.toLowerCase().includes(s) ||
        (r.company_name ?? "").toLowerCase().includes(s) ||
        (r.location_name ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, q]);

  const totalDueAll = useMemo(
    () => filtered.reduce((sum, r) => sum + (Number(r.total_due) || 0), 0),
    [filtered]
  );

  const inputClass =
    "w-full md:w-[520px] p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400";

  if (selected) {
    return (
      <WarehousePodHistoryView
        pod={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mx-auto p-8 bg-white dark:bg-[#23272f] rounded shadow">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold">Warehouse Pods</h2>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-4 py-2 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">
              Total Due (filtered)
            </p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              ₹{totalDueAll.toFixed(2)}
            </p>
          </div>

          <button
            onClick={() => void load()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name/contact/company/location..."
          className={inputClass}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">No pods found.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-[980px] w-full border border-gray-200 dark:border-gray-700 rounded">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="p-2 text-left">Client</th>
                <th className="p-2 text-left">Company</th>
                <th className="p-2 text-left">Location</th>
                <th className="p-2 text-left">Next Charge</th>
                <th className="p-2 text-left">Next Payment</th>
                <th className="p-2 text-left">Total Due</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`cursor-pointer ${rowBandClass(r.severity_band)}`}
                >
                  <td className="p-2">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {r.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {r.client_id ?? "—"} • {r.contact}
                    </div>
                  </td>

                  <td className="p-2 text-sm text-gray-800 dark:text-gray-200">
                    {r.company_name ?? "—"}
                  </td>

                  <td className="p-2 text-sm text-gray-800 dark:text-gray-200">
                    {r.location_name ?? "—"}
                  </td>

                  <td className="p-2 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(r.next_charge_date).toLocaleDateString("en-IN")}
                  </td>

                  <td className="p-2 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(r.next_payment_date).toLocaleDateString("en-IN")}
                  </td>

                  <td className="p-2 font-semibold text-blue-700 dark:text-blue-300">
                    ₹{Number(r.total_due).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Click a row to view charge/payment history.
          </p>
        </div>
      )}
    </div>
  );
}
