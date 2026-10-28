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
  deletePurchase,
  savePurchase,
  uploadInvoice,
  type PurchaseData,
} from "@/lib/inventory/purchase-client";

export default function InventoryPurchases({ isAdmin }: { isAdmin: boolean }) {
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
            <PurchaseTable
              data={data}
              isAdmin={isAdmin}
              onDeleted={() => setReload((x) => x + 1)}
            />
          </>
        ) : (
          <p role="status">Loading purchases…</p>
        )}
      </div>
    </div>
  );
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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
  const [totalCost, setTotalCost] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function updateAmount(field: "quantity" | "unitPrice" | "totalCost", value: string) {
    const next = { quantity, unitPrice, totalCost, [field]: value };
    const q = Number(next.quantity);
    const unit = Number(next.unitPrice);
    const total = Number(next.totalCost);
    if (field === "quantity") {
      if (q > 0 && unit >= 0 && next.unitPrice !== "")
        next.totalCost = (q * unit).toFixed(2);
      else if (q > 0 && total >= 0 && next.totalCost !== "")
        next.unitPrice = (total / q).toFixed(2);
    } else if (field === "unitPrice") {
      if (
        q > 0 &&
        unit >= 0 &&
        next.quantity !== "" &&
        next.unitPrice !== ""
      )
        next.totalCost = (q * unit).toFixed(2);
      else if (unit > 0 && total >= 0 && next.totalCost !== "")
        next.quantity = formatQuantity(total / unit);
    } else if (field === "totalCost") {
      if (
        q > 0 &&
        total >= 0 &&
        next.quantity !== "" &&
        next.totalCost !== ""
      )
        next.unitPrice = (total / q).toFixed(2);
      else if (unit > 0 && total >= 0 && next.unitPrice !== "")
        next.quantity = formatQuantity(total / unit);
    }
    setQuantity(next.quantity);
    setUnitPrice(next.unitPrice);
    setTotalCost(next.totalCost);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const q = Number(quantity);
      const unit = Number(unitPrice);
      const total = Number(totalCost);
      const filled = [quantity, unitPrice, totalCost].filter(
        (value) => value.trim() !== "",
      ).length;
      if (filled < 2)
        throw new Error("Enter any two of quantity, unit price, or total cost.");
      if (!Number.isInteger(q) || q <= 0)
        throw new Error("Quantity must be a positive whole number.");
      if (!Number.isFinite(unit) || unit < 0)
        throw new Error("Enter a valid unit price.");
      if (!Number.isFinite(total) || total < 0)
        throw new Error("Enter a valid total cost.");
      if (Math.abs(q * unit - total) > 0.01)
        throw new Error("Quantity × unit price must equal total cost.");
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
      setTotalCost("");
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
            className={inputField}
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => updateAmount("quantity", e.target.value)}
          />
        </label>
        <label>
          <span className={fieldLabel}>Unit price (₹)</span>
          <input
            className={inputField}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={unitPrice}
            onChange={(e) => updateAmount("unitPrice", e.target.value)}
          />
        </label>
        <label>
          <span className={fieldLabel}>Total cost (₹)</span>
          <input
            className={inputField}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={totalCost}
            onChange={(e) => updateAmount("totalCost", e.target.value)}
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
        Enter any two of quantity, unit price, or total cost; the third is
        calculated automatically. {" "}
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
function PurchaseTable({
  data,
  isAdmin,
  onDeleted,
}: {
  data: PurchaseData;
  isAdmin: boolean;
  onDeleted: () => void;
}) {
  async function remove(id: string) {
    if (!window.confirm("Delete this purchase? This cannot be undone.")) return;
    try {
      await deletePurchase(id);
      onDeleted();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to delete purchase",
      );
    }
  }
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
                "Total cost",
                "6-month average",
                "Signal",
                "Invoice",
                ...(isAdmin ? ["Admin action"] : []),
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
                  ₹
                  {(p.quantity * p.unitPrice).toLocaleString("en-IN", {
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
                {isAdmin ? (
                  <td className={tableCell}>
                    <button
                      className={buttonSecondary}
                      onClick={() => remove(p.id)}
                    >
                      Delete
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {!data.purchases.length ? (
              <tr>
                <td colSpan={isAdmin ? 11 : 10} className={tableCell}>
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
