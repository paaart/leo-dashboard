"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/DashboardUI";
import {
  alertDanger,
  alertSuccess,
  badgeClass,
  buttonPrimary,
  buttonSecondary,
  cardPadded,
  fieldLabel,
  inputField,
  selectField,
  tableBase,
  tableCell,
  tableHead,
  tableHeadCell,
  tableRow,
  tableWrapper,
} from "@/components/shared/ui";
import {
  loadDispatches,
  receiveDispatch,
  createDispatch,
  loadCountRequests,
  createCountRequest,
  completeCountRequest,
  loadReconciliation,
} from "@/lib/inventory/dispatch-client";
import { loadInventoryStock } from "@/lib/inventory/client";
import { inventoryToday } from "@/lib/inventory/count-validation";
import type {
  InventoryBranch,
  InventoryMaterial,
  InventoryDispatch,
  InventoryCountRequest,
  InventoryReconciliation,
} from "@/lib/inventory/types";
export default function InventoryMovement({
  mode,
}: {
  mode: "dispatches" | "count-requests" | "reconciliation";
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {mode === "dispatches" ? (
          <Dispatches
            message={message}
            setMessage={setMessage}
            error={error}
            setError={setError}
          />
        ) : mode === "count-requests" ? (
          <CountRequests
            message={message}
            setMessage={setMessage}
            error={error}
            setError={setError}
          />
        ) : (
          <Reconciliation error={error} setError={setError} />
        )}
      </div>
    </div>
  );
}
function Dispatches({
  message,
  setMessage,
  error,
  setError,
}: {
  message: string;
  setMessage: (x: string) => void;
  error: string;
  setError: (x: string) => void;
}) {
  const [data, setData] = useState<InventoryDispatch[]>([]);
  const [branches, setBranches] = useState<InventoryBranch[]>([]);
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [reload, setReload] = useState(0);
  const [branchId, setBranchId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([loadDispatches(), loadInventoryStock()])
      .then(([d, s]) => {
        setData(d);
        setBranches(s.branches);
        setMaterials(s.materials);
        setBranchId((x) => x || s.branches.find((b) => !b.isCentral)?.id || "");
        setMaterialId((x) => x || s.materials[0]?.id || "");
      })
      .catch((e) => setError(e.message));
  }, [reload, setError]);
  const central = branches.find((b) => b.isCentral);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createDispatch({
        fromBranchId: central?.id,
        toBranchId: branchId,
        materialId,
        quantitySent: Number(quantity),
      });
      setMessage("Dispatch sent and marked in transit.");
      setQuantity("");
      setReload((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to dispatch");
    } finally {
      setBusy(false);
    }
  }
  async function receive(id: string, q: number) {
    try {
      await receiveDispatch(id, q);
      setMessage("Receipt confirmed.");
      setReload((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to confirm receipt");
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Inventory Management"
        title="Dispatches"
        subtitle="Send material from Uttarahalli and confirm what the branch received."
      />
      {message ? <div className={alertSuccess}>{message}</div> : null}
      {error ? <div className={alertDanger}>{error}</div> : null}
      <form
        onSubmit={submit}
        className={`${cardPadded} grid gap-4 sm:grid-cols-4`}
      >
        <label>
          <span className={fieldLabel}>Receiving branch</span>
          <select
            className={selectField}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {branches
              .filter((b) => !b.isCentral)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span className={fieldLabel}>Material</span>
          <select
            className={selectField}
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={fieldLabel}>Quantity sent</span>
          <input
            required
            min="1"
            step="1"
            className={inputField}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
        <div className="flex items-end">
          <button className={buttonPrimary} disabled={busy || !central}>
            {busy ? "Sending…" : "Send dispatch"}
          </button>
        </div>
      </form>
      <div className={tableWrapper}>
        <table className={tableBase}>
          <thead className={tableHead}>
            <tr>
              {[
                "Sent",
                "From",
                "To",
                "Material",
                "Sent",
                "Received",
                "Status",
                "Action",
              ].map((h, index) => (
                <th key={`${h}-${index}`} className={tableHeadCell}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <DispatchRow key={d.id} d={d} onReceive={receive} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function DispatchRow({
  d,
  onReceive,
}: {
  d: InventoryDispatch;
  onReceive: (id: string, q: number) => void;
}) {
  const [q, setQ] = useState(String(d.quantitySent));
  return (
    <tr className={tableRow}>
      <td className={tableCell}>
        {new Date(d.dispatchedAt).toLocaleDateString("en-IN")}
      </td>
      <td className={tableCell}>{d.fromBranchName}</td>
      <td className={tableCell}>{d.toBranchName}</td>
      <td className={tableCell}>{d.materialName}</td>
      <td className={tableCell}>{d.quantitySent}</td>
      <td className={tableCell}>{d.quantityReceived ?? "—"}</td>
      <td className={tableCell}>
        <span
          className={badgeClass(
            d.status === "received" ? "success" : "warning",
          )}
        >
          {d.status === "received" ? "Received" : "In transit"}
        </span>
      </td>
      <td className={tableCell}>
        {d.status === "in_transit" ? (
          <span className="flex gap-2">
            <input
              aria-label="Quantity received"
              className={`${inputField} w-24`}
              type="number"
              min="0"
              max={d.quantitySent}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button
              className={buttonSecondary}
              onClick={() => onReceive(d.id, Number(q))}
            >
              Confirm
            </button>
          </span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
function CountRequests({
  message,
  setMessage,
  error,
  setError,
}: {
  message: string;
  setMessage: (x: string) => void;
  error: string;
  setError: (x: string) => void;
}) {
  const [data, setData] = useState<InventoryCountRequest[]>([]);
  const [branches, setBranches] = useState<InventoryBranch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [note, setNote] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    Promise.all([loadCountRequests(false), loadInventoryStock()])
      .then(([r, s]) => {
        setData(r);
        setBranches(s.branches);
        setBranchId((x) => x || s.branches[0]?.id || "");
      })
      .catch((e) => setError(e.message));
  }, [reload, setError]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCountRequest({ branchId, note });
      setMessage("Count request created.");
      setNote("");
      setReload((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create request");
    }
  }
  async function complete(id: string) {
    try {
      await completeCountRequest(id);
      setMessage("Request marked complete.");
      setReload((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete request");
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Inventory Management"
        title="Count requests"
        subtitle="Ask a branch to report a shelf count and track completion."
      />
      {message ? <div className={alertSuccess}>{message}</div> : null}
      {error ? <div className={alertDanger}>{error}</div> : null}
      <form
        onSubmit={submit}
        className={`${cardPadded} flex flex-wrap items-end gap-4`}
      >
        <label>
          <span className={fieldLabel}>Branch</span>
          <select
            className={selectField}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-64 flex-1">
          <span className={fieldLabel}>Note</span>
          <input
            className={inputField}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Month-end count, urgent check…"
          />
        </label>
        <button className={buttonPrimary}>Request count</button>
      </form>
      <div className={tableWrapper}>
        <table className={tableBase}>
          <thead className={tableHead}>
            <tr>
              {["Requested", "Branch", "Note", "Due", "Status", "Action"].map(
                (h) => (
                  <th key={h} className={tableHeadCell}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr className={tableRow} key={r.id}>
                <td className={tableCell}>
                  {new Date(r.requestedAt).toLocaleDateString("en-IN")}
                </td>
                <td className={tableCell}>{r.branchName}</td>
                <td className={tableCell}>{r.note || "—"}</td>
                <td className={tableCell}>{r.dueDate || "—"}</td>
                <td className={tableCell}>
                  <span
                    className={badgeClass(
                      r.completedAt ? "success" : "warning",
                    )}
                  >
                    {r.completedAt ? "Complete" : "Pending"}
                  </span>
                </td>
                <td className={tableCell}>
                  {!r.completedAt ? (
                    <button
                      className={buttonSecondary}
                      onClick={() => complete(r.id)}
                    >
                      Mark complete
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Reconciliation({
  error,
  setError,
}: {
  error: string;
  setError: (x: string) => void;
}) {
  const [month, setMonth] = useState(inventoryToday().slice(0, 7));
  const [rows, setRows] = useState<InventoryReconciliation[]>([]);
  useEffect(() => {
    loadReconciliation(month)
      .then(setRows)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Unable to load reconciliation",
        ),
      );
  }, [month, setError]);
  return (
    <>
      <PageHeader
        eyebrow="Inventory Management"
        title="Reconciliation"
        subtitle="Opening + received − sent − closing = apparent usage. Missing counts remain blank."
      />
      {error ? <div className={alertDanger}>{error}</div> : null}
      <label className="block max-w-xs">
        <span className={fieldLabel}>Month</span>
        <input
          className={inputField}
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </label>
      <div className={tableWrapper}>
        <table className={tableBase}>
          <thead className={tableHead}>
            <tr>
              {[
                "Branch",
                "Material",
                "Opening",
                "Received",
                "Sent",
                "Closing",
                "Apparent usage",
              ].map((h) => (
                <th key={h} className={tableHeadCell}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr className={tableRow} key={`${r.branchId}:${r.materialId}`}>
                <td className={tableCell}>{r.branchName}</td>
                <td className={tableCell}>
                  {r.materialName} ({r.unit})
                </td>
                <td className={tableCell}>{r.opening ?? "—"}</td>
                <td className={tableCell}>{r.received}</td>
                <td className={tableCell}>{r.sent}</td>
                <td className={tableCell}>{r.closing ?? "—"}</td>
                <td className={tableCell}>{r.used ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
