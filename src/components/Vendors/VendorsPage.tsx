"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/DashboardUI";
import {
  alertDanger,
  alertSuccess,
  buttonPrimary,
  cardPadded,
  fieldLabel,
  inputField,
  tableBase,
  tableCell,
  tableHead,
  tableHeadCell,
  tableRow,
  tableWrapper,
} from "@/components/shared/ui";
import { loadPurchaseData, saveVendor } from "@/lib/inventory/purchase-client";
import type { InventoryVendor } from "@/lib/inventory/types";
export default function VendorsPage() {
  const [vendors, setVendors] = useState<InventoryVendor[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    loadPurchaseData()
      .then((d) => setVendors(d.vendors))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load vendors"),
      );
  }, [reload]);
  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Operations"
          title="Vendors"
          subtitle="Manage packaging-material suppliers and see their purchase history and spend."
        />
        {error ? <div className={alertDanger}>{error}</div> : null}
        {saved ? <div className={alertSuccess}>{saved}</div> : null}
        <VendorForm
          onSaved={() => {
            setSaved("Vendor added.");
            setReload((x) => x + 1);
          }}
        />
        <div className={tableWrapper}>
          <table className={tableBase}>
            <thead className={tableHead}>
              <tr>
                {["Vendor", "Contact", "Purchases", "Spend"].map((h) => (
                  <th scope="col" className={tableHeadCell} key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr className={tableRow} key={v.id}>
                  <td className={tableCell}>
                    <div className="font-medium">{v.name}</div>
                    {v.notes ? (
                      <div className="text-xs text-fg-muted">{v.notes}</div>
                    ) : null}
                  </td>
                  <td className={tableCell}>{v.phone || v.email || "—"}</td>
                  <td className={tableCell}>{v.purchaseCount ?? 0}</td>
                  <td className={tableCell}>
                    ₹
                    {(v.totalSpend ?? 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
              {!vendors.length ? (
                <tr>
                  <td colSpan={4} className={tableCell}>
                    No vendors yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function VendorForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveVendor({ name, phone, email });
      setName("");
      setPhone("");
      setEmail("");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save vendor");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className={`${cardPadded} grid gap-4 sm:grid-cols-4`}
    >
      <label>
        <span className={fieldLabel}>Vendor name</span>
        <input
          required
          className={inputField}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        <span className={fieldLabel}>Phone</span>
        <input
          className={inputField}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label>
        <span className={fieldLabel}>Email</span>
        <input
          className={inputField}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <div className="flex items-end">
        <button className={buttonPrimary} disabled={busy}>
          {busy ? "Saving…" : "Add vendor"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger sm:col-span-4">
          {error}
        </p>
      ) : null}
    </form>
  );
}
