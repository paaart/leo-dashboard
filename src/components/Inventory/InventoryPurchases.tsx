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
  tableBase,
  tableCell,
  tableHead,
  tableHeadCell,
  tableRow,
  tableWrapper,
} from "@/components/shared/ui";
import { inventoryToday } from "@/lib/inventory/count-validation";
import {
  invoiceUrl,
  loadPurchaseData,
  savePurchase,
  uploadInvoice,
  type PurchaseData,
} from "@/lib/inventory/purchase-client";

export default function InventoryPurchases() {
  const [data, setData] = useState<PurchaseData | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    loadPurchaseData()
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Unable to load purchases");
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);
  if (error)
    return (
      <div className="p-6">
        <div className={alertDanger}>
          {error}{" "}
          <button
            className={buttonSecondary}
            onClick={() => {
              setError("");
              setReload((x) => x + 1);
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Inventory Management"
          title="Purchases"
          subtitle="Record central-store and emergency branch purchases. Prices are compared with the trailing six-month average for that material."
        />
        {saved ? <div className={alertSuccess}>{saved}</div> : null}
        {data ? (
          <>
            <PurchaseForm
              data={data}
              onSaved={(message) => {
                setSaved(message);
                setReload((x) => x + 1);
              }}
            />
            <PurchaseTable data={data} />
          </>
        ) : (
          <p role="status">Loading purchases…</p>
        )}
      </div>
    </div>
  );
}
function PurchaseForm({
  data,
  onSaved,
}: {
  data: PurchaseData;
  onSaved: (message: string) => void;
}) {
  const [branchId, setBranchId] = useState(data.branches[0]?.id ?? "");
  const [materialId, setMaterialId] = useState(data.materials[0]?.id ?? "");
  const [vendorId, setVendorId] = useState(data.vendors[0]?.id ?? "");
  const [date, setDate] = useState(inventoryToday());
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let invoicePath: string | undefined;
      if (file) invoicePath = (await uploadInvoice(file)).path;
      await savePurchase({
        branchId,
        materialId,
        vendorId,
        purchaseDate: date,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        invoicePath,
        notes,
      });
      onSaved("Purchase saved.");
      setQuantity("");
      setUnitPrice("");
      setNotes("");
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save purchase");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className={`${cardPadded} space-y-4`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className={fieldLabel}>Branch</span>
          <select
            className={selectField}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {data.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.isCentral ? " · Central store" : ""}
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
            {data.materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.unit})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={fieldLabel}>Vendor</span>
          <select
            className={selectField}
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            {data.vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={fieldLabel}>Purchase date</span>
          <input
            className={inputField}
            type="date"
            max={inventoryToday()}
            min="2026-09-01"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          <span className={fieldLabel}>Quantity</span>
          <input
            required
            className={inputField}
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
        <label>
          <span className={fieldLabel}>Unit price (₹)</span>
          <input
            required
            className={inputField}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
        </label>
        <label className="sm:col-span-2">
          <span className={fieldLabel}>Invoice (optional)</span>
          <input
            className={inputField}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="sm:col-span-2">
          <span className={fieldLabel}>Notes (optional)</span>
          <input
            className={inputField}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>
      {error ? (
        <div role="alert" className={alertDanger}>
          {error}
        </div>
      ) : null}
      <div className={alertInfo}>
        Branch purchases are treated as emergency purchases. This records what
        was bought; it does not change the shelf count automatically.
      </div>
      <button className={buttonPrimary} disabled={busy || !data.vendors.length}>
        {busy ? "Saving…" : "Save purchase"}
      </button>
      {!data.vendors.length ? (
        <p className="text-sm text-fg-muted">
          Add a vendor in the Vendors module before recording a purchase.
        </p>
      ) : null}
    </form>
  );
}
function PurchaseTable({ data }: { data: PurchaseData }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Recent purchases</h2>
      <div className={tableWrapper}>
        <table className={tableBase}>
          <thead className={tableHead}>
            <tr>
              {[
                "Date",
                "Branch",
                "Material",
                "Vendor",
                "Qty",
                "Unit price",
                "6-month average",
                "Signal",
                "Invoice",
              ].map((h) => (
                <th scope="col" key={h} className={tableHeadCell}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.purchases.map((p) => (
              <tr className={tableRow} key={p.id}>
                <td className={tableCell}>{p.purchaseDate}</td>
                <td className={tableCell}>{p.branchName}</td>
                <td className={tableCell}>{p.materialName}</td>
                <td className={tableCell}>{p.vendorName}</td>
                <td className={tableCell}>
                  {p.quantity} {p.materialUnit}
                </td>
                <td className={tableCell}>
                  ₹
                  {p.unitPrice.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className={tableCell}>
                  {p.sixMonthAverage === null
                    ? "No history"
                    : `₹${p.sixMonthAverage.toFixed(2)}`}
                </td>
                <td className={tableCell}>
                  <span
                    className={badgeClass(
                      p.priceSignal === "good"
                        ? "success"
                        : p.priceSignal === "high"
                          ? "warning"
                          : "neutral",
                    )}
                  >
                    {p.priceSignal === "no_history"
                      ? "No history"
                      : p.priceSignal === "good"
                        ? "Good deal"
                        : p.priceSignal === "high"
                          ? "Above average"
                          : "Near average"}
                  </span>
                </td>
                <td className={tableCell}>
                  {p.invoicePath ? (
                    <a
                      className="text-accent underline"
                      href={invoiceUrl(p.invoicePath)}
                    >
                      Open
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!data.purchases.length ? (
              <tr>
                <td colSpan={9} className={tableCell}>
                  No purchases recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
