"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/DashboardUI";
import {
  alertDanger,
  alertInfo,
  alertSuccess,
  badgeClass,
  buttonPrimary,
  buttonSecondary,
  cardPadded,
  fieldLabel,
  inputField,
  selectField,
  tableWrapper,
  tableBase,
  tableHead,
  tableHeadCell,
  tableRow,
  tableCell,
} from "@/components/shared/ui";
import {
  loadInventoryHistory,
  loadInventoryStock,
  saveInventoryCounts,
} from "@/lib/inventory/client";
import {
  inventoryToday,
  OPENING_DATE,
  validCountDate,
} from "@/lib/inventory/count-validation";
import type {
  CountEdit,
  InventoryBranch,
  InventoryMaterial,
  StockData,
} from "@/lib/inventory/types";

function countAge(date: string) {
  const days = Math.floor(
    (Date.parse(`${inventoryToday()}T00:00:00Z`) -
      Date.parse(`${date}T00:00:00Z`)) /
      86400000,
  );
  return days === 0
    ? "Counted today"
    : days === 1
      ? "Counted yesterday"
      : `Counted ${days} days ago`;
}

export default function InventoryCounts({
  mode,
}: {
  mode: "overview" | "update";
}) {
  const [date, setDate] = useState(inventoryToday);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  function discardDraft() {
    if (dirty && !window.confirm("Discard the counts you have not saved?"))
      return false;
    setDirty(false);
    return true;
  }
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<StockData | null>(null);
  const [error, setError] = useState("");
  const [branchId, setBranchId] = useState("");
  const queryDate = mode === "update" ? date : undefined;
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    loadInventoryStock(queryDate)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setBranchId((current) =>
          result.branches.some((b) => b.id === current)
            ? current
            : mode === "update"
              ? (result.branches[0]?.id ?? "")
              : "",
        );
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Unable to load counts",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [queryDate, revision, mode]);

  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Inventory Management"
          title={mode === "update" ? "Update stock" : "Stock overview"}
          subtitle={
            mode === "update"
              ? "Count only what is on the shelf. Leave materials blank to keep them unchanged."
              : "The latest reported count for each material and branch. Counts may be from different dates."
          }
        />
        {error ? (
          <div role="alert" className={alertDanger}>
            {error}{" "}
            <button
              className={buttonSecondary}
              onClick={() => setRevision((r) => r + 1)}
            >
              Retry
            </button>
          </div>
        ) : null}
        {!data && !error ? <p role="status">Loading stock…</p> : null}
        {data?.branches.length === 0 ? (
          <div className={alertInfo}>
            No active branches are available to you. Ask an administrator to
            assign your branch in Setup → Branch staff.
          </div>
        ) : null}
        {data && data.branches.length > 0 ? (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <label className="w-full sm:w-72">
                <span className={fieldLabel}>Branch</span>
                <select
                  className={selectField}
                  value={branchId}
                  disabled={busy}
                  onChange={(e) => {
                    if (discardDraft()) setBranchId(e.target.value);
                  }}
                >
                  {mode === "overview" ? (
                    <option value="">
                      {data.isCompanyView
                        ? "Company total · All branches"
                        : "All assigned branches"}
                    </option>
                  ) : null}
                  {data.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.isCentral ? " · Central store" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {mode === "update" ? (
                <label>
                  <span className={fieldLabel}>Count date</span>
                  <input
                    type="date"
                    required
                    min={OPENING_DATE}
                    max={inventoryToday()}
                    value={date}
                    disabled={busy}
                    onChange={(e) => {
                      if (validCountDate(e.target.value) && discardDraft())
                        setDate(e.target.value);
                    }}
                    className={inputField}
                  />
                </label>
              ) : null}
            </div>
            {mode === "update" ? (
              <StockForm
                key={`${branchId}:${date}:${revision}`}
                data={data}
                branchId={branchId}
                date={date}
                onDirty={setDirty}
                onBusy={setBusy}
                onSaved={() => {
                  if (discardDraft()) setRevision((r) => r + 1);
                }}
              />
            ) : (
              <StockOverview data={data} branchId={branchId} />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function StockForm({
  data,
  branchId,
  date,
  onSaved,
  onDirty,
  onBusy,
}: {
  data: StockData;
  branchId: string;
  date: string;
  onSaved: () => void;
  onDirty: (dirty: boolean) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const counts = new Map(
    data.counts
      .filter((c) => c.branchId === branchId)
      .map((c) => [c.materialId, c]),
  );
  const filled = Object.entries(draft).filter(
    ([, value]) => value.trim() !== "",
  );
  useEffect(() => {
    onDirty(filled.length > 0 && !saved);
  }, [filled.length, saved, onDirty]);
  // Warn on leaving the page while counts have not been saved.
  useEffect(() => {
    if (!filled.length || saved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [filled.length, saved]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    onBusy(true);
    try {
      await saveInventoryCounts(
        branchId,
        date,
        filled.map(([materialId, value]) => ({
          materialId,
          quantity: Number(value),
          version: counts.get(materialId)?.version ?? null,
        })),
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save counts");
    } finally {
      setSaving(false);
      onBusy(false);
    }
  }
  if (saved)
    return (
      <div role="status" className={alertSuccess}>
        Stock counts saved.{" "}
        <button className={buttonSecondary} onClick={onSaved}>
          Enter more counts
        </button>
      </div>
    );
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className={alertInfo}>
        {date === OPENING_DATE
          ? "Enter August closing counts here. These are the opening figures for September 2026."
          : "Choose the actual count date, including the last day of the month for month-end counts."}{" "}
        Existing counts for that date are shown below; entering a replacement
        records a correction.
      </div>
      {error ? (
        <div role="alert" className={alertDanger}>
          {error}
        </div>
      ) : null}
      {data.materials.length === 0 ? (
        <p>No active materials. Ask an administrator to add them in Setup.</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.materials.map((material) => (
          <label className={cardPadded} key={material.id}>
            <span className={fieldLabel}>
              {material.name}{" "}
              <span className="font-normal text-fg-muted">
                ({material.unit})
              </span>
            </span>
            <span className="mb-3 block text-sm text-fg-muted">
              This date:{" "}
              {counts.has(material.id)
                ? counts.get(material.id)!.quantity.toLocaleString("en-IN")
                : "Not counted"}
            </span>
            <input
              className={inputField}
              type="number"
              inputMode="numeric"
              min={0}
              max={2147483647}
              step={1}
              placeholder="Leave unchanged"
              value={draft[material.id] ?? ""}
              disabled={saving}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [material.id]: e.target.value }))
              }
            />
          </label>
        ))}
      </div>
      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-edge bg-surface p-4">
        <button
          className={buttonPrimary}
          disabled={saving || !filled.length || !branchId}
        >
          {saving
            ? "Saving…"
            : `Save ${filled.length} count${filled.length === 1 ? "" : "s"}`}
        </button>
        <button
          type="button"
          className={buttonSecondary}
          disabled={saving}
          onClick={onSaved}
        >
          Reload counts
        </button>
        <span className="text-sm text-fg-muted">
          Zero means none on the shelf.
        </span>
      </div>
    </form>
  );
}

function StockOverview({
  data,
  branchId,
}: {
  data: StockData;
  branchId: string;
}) {
  const [historyMaterial, setHistoryMaterial] =
    useState<InventoryMaterial | null>(null);
  const branches = data.branches.filter((b) => !branchId || b.id === branchId);
  const counts = data.counts.filter((c) =>
    branches.some((b) => b.id === c.branchId),
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.materials.map((material) => {
          const rows = counts.filter((c) => c.materialId === material.id);
          const total = rows.reduce((sum, c) => sum + c.quantity, 0);
          const oldest = rows.map((c) => c.countDate).sort()[0];
          const missing = branches.length - rows.length;
          // Setup's minimum is a company-wide threshold, not a per-branch target.
          const low = material.minStock !== null && total < material.minStock;
          return (
            <article key={material.id} className={cardPadded}>
              <h2 className="font-medium">{material.name}</h2>
              <p className="my-2 text-3xl font-semibold">
                {rows.length ? total.toLocaleString("en-IN") : "—"}{" "}
                <span className="text-sm font-normal text-fg-muted">
                  {material.unit}
                </span>
              </p>
              <p className="text-sm text-fg-muted">
                {oldest
                  ? `${countAge(oldest)}${rows.length > 1 ? " · oldest report" : ""}`
                  : "No counts yet"}
              </p>
              <div className="my-3 flex flex-wrap gap-2">
                {missing > 0 ? (
                  <span className={badgeClass("warning")}>
                    {missing} branch{missing === 1 ? "" : "es"} not counted
                  </span>
                ) : (
                  <span className={badgeClass("neutral")}>
                    All selected branches counted
                  </span>
                )}
                {low && rows.length > 0 && !branchId && data.isCompanyView ? (
                  <span className={badgeClass("warning")}>
                    {missing ? "Reported subtotal below minimum" : "Low stock"}{" "}
                    ({material.minStock})
                  </span>
                ) : null}
              </div>
              <button
                className={buttonSecondary}
                onClick={() => setHistoryMaterial(material)}
              >
                History &amp; edit log
              </button>
            </article>
          );
        })}
      </div>
      {historyMaterial ? (
        <History
          key={`${historyMaterial.id}:${branchId}`}
          material={historyMaterial}
          branches={branches}
          branchId={branchId}
          onClose={() => setHistoryMaterial(null)}
        />
      ) : null}
    </>
  );
}

function History({
  material,
  branches,
  branchId,
  onClose,
}: {
  material: InventoryMaterial;
  branches: InventoryBranch[];
  branchId: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<CountEdit[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    loadInventoryHistory(material.id, branchId, offset)
      .then((result) => {
        if (!cancelled) setRows(result);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Unable to load history",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [material.id, branchId, offset, retry]);
  return (
    <section className="space-y-3" aria-label={`${material.name} history`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {material.name} · History &amp; edit log
        </h2>
        <button className={buttonSecondary} onClick={onClose}>
          Close history
        </button>
      </div>
      <p className="text-sm text-fg-muted">
        Every count and correction, newest save first. To correct a count,
        choose its branch and count date in Update stock.
      </p>
      {error ? (
        <div role="alert" className={alertDanger}>
          {error}{" "}
          <button
            className={buttonSecondary}
            onClick={() => setRetry((r) => r + 1)}
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <p role="status">Loading history…</p>
      ) : (
        <>
          <div className={tableWrapper}>
            <table className={tableBase}>
              <thead className={tableHead}>
                <tr>
                  {[
                    "Count date",
                    "Branch",
                    "Old → New",
                    "Changed by",
                    "Saved at (IST)",
                  ].map((h) => (
                    <th key={h} scope="col" className={tableHeadCell}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={tableRow}>
                    <td className={tableCell}>{row.countDate}</td>
                    <td className={tableCell}>
                      {branches.find((b) => b.id === row.branchId)?.name}
                    </td>
                    <td className={tableCell}>
                      {row.oldQuantity ?? "Not counted"} → {row.newQuantity}{" "}
                      {material.unit}
                    </td>
                    <td className={tableCell}>{row.editedBy}</td>
                    <td className={tableCell}>
                      {new Date(row.editedAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={5} className={tableCell}>
                      No count history on this page.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <button
              disabled={offset === 0}
              className={buttonSecondary}
              onClick={() => setOffset((o) => Math.max(0, o - 100))}
            >
              Previous
            </button>
            <button
              disabled={rows.length < 100}
              className={buttonSecondary}
              onClick={() => setOffset((o) => o + 100)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
