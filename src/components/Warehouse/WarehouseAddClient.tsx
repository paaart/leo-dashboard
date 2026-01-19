"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

type Option = { id: number; name: string; is_active?: boolean };

export type PaymentMode =
  | "cash"
  | "upi"
  | "bank_transfer"
  | "cheque"
  | "card"
  | "other";

export default function WarehouseAddClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [rate, setRate] = useState("");

  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  const [durationMonths, setDurationMonths] = useState("1");

  const [billingInterval, setBillingInterval] = useState<
    "monthly" | "yearly" | "quarterly" | "half_yearly"
  >("monthly");

  const [modeOfPayment, setModeOfPayment] = useState<PaymentMode>("cash");
  const [customPaymentMode, setCustomPaymentMode] = useState("");

  // company/location dropdowns
  const [companies, setCompanies] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [companyId, setCompanyId] = useState<number | "">("");
  const [locationId, setLocationId] = useState<number | "">("");
  const [insuranceProvider, setInsuranceProvider] = useState<"none" | "leo">(
    "none"
  );
  const [insuranceValue, setInsuranceValue] = useState("0");
  const [oldOutstanding, setOldOutstanding] = useState("");
  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400";

  const numericOnly =
    (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (/^\d*\.?\d*$/.test(value)) {
        setter(value);
      }
    };

  function getNextPaymentDate(
    startDate: string,
    interval: "monthly" | "quarterly" | "half_yearly" | "yearly"
  ) {
    const d = new Date(startDate);

    switch (interval) {
      case "monthly":
        d.setMonth(d.getMonth() + 1);
        break;
      case "quarterly":
        d.setMonth(d.getMonth() + 3);
        break;
      case "half_yearly":
        d.setMonth(d.getMonth() + 6);
        break;
      case "yearly":
        d.setFullYear(d.getFullYear() + 1);
        break;
    }

    return d.toISOString().split("T")[0];
  }

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [{ data: comp, error: compErr }, { data: loc, error: locErr }] =
          await Promise.all([
            supabase
              .from("companies")
              .select("id,name,is_active")
              .eq("is_active", true)
              .order("name"),
            supabase
              .from("locations")
              .select("id,name,is_active")
              .eq("is_active", true)
              .order("name"),
          ]);

        if (compErr) throw compErr;
        if (locErr) throw locErr;

        setCompanies((comp ?? []) as Option[]);
        setLocations((loc ?? []) as Option[]);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to load options");
        setCompanies([]);
        setLocations([]);
      }
    };

    void fetchOptions();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !contact.trim() || !rate || isNaN(Number(rate))) {
      toast.error("Please fill required fields");
      return;
    }
    if (oldOutstanding && isNaN(Number(oldOutstanding))) {
      toast.error("Old outstanding must be a number");
      return;
    }

    // DB client_id generator needs location_id
    if (locationId === "") {
      toast.error("Please select Location");
      return;
    }

    setLoading(true);

    const run = async () => {
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        contact: contact.trim(),

        company_id: companyId === "" ? null : Number(companyId),
        location_id: Number(locationId),

        start_date: startDate,
        duration_months: Number(durationMonths),

        billing_interval: billingInterval,
        rate: Number(rate),

        mode_of_payment:
          modeOfPayment === "other"
            ? customPaymentMode.trim() || "other"
            : modeOfPayment,

        // 🔥 engines
        next_charge_date: startDate,
        next_payment_date: getNextPaymentDate(startDate, billingInterval),

        insurance_provider: insuranceProvider,
        insurance_value:
          insuranceProvider === "leo" ? Number(insuranceValue) : 0,
        old_outstanding: Number(oldOutstanding || 0),
      };

      const { data, error } = await supabase
        .from("warehouse_pods")
        .insert(payload)
        .select("id, client_id")
        .single();

      if (error) throw error;

      // optional: THEN run accrue to keep future months consistent
      const { error: rpcErr } = await supabase.rpc("warehouse_accrue_charges", {
        p_pod_id: data.id,
      });
      if (rpcErr) throw rpcErr;

      return data.client_id as string;
    };

    try {
      const clientId = await toast.promise(run(), {
        loading: "Creating client...",
        success: "Client created ✅",
        error: (err) => getErrorMessage(err) || "Failed to create client",
      });

      toast.success(`Client ID: ${clientId}`);

      // reset
      setName("");
      setEmail("");
      setContact("");
      setRate("");
      setDurationMonths("1");
      setBillingInterval("monthly");
      setCompanyId("");
      setLocationId("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setModeOfPayment("cash");
      setCustomPaymentMode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto bg-white dark:bg-[#23272f] p-6 rounded shadow min-h-screen">
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Add Warehouse Client</h2>

        <div className="grid gap-3">
          <Field label="Name *">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
            />
          </Field>

          <Field label="Email">
            <input
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional"
            />
          </Field>

          <Field label="Contact *">
            <input
              className={inputClass}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Phone number"
            />
          </Field>

          <Field label="Amount (cost per cycle) *">
            <input
              className={inputClass}
              type="text"
              inputMode="decimal"
              value={rate}
              onChange={numericOnly(setRate)}
              placeholder="e.g. 2500"
            />
          </Field>

          <Field label="Insurance">
            <select
              className={inputClass}
              value={insuranceProvider}
              onChange={(e) => {
                const v = e.target.value as "none" | "leo";
                setInsuranceProvider(v);
                if (v !== "leo") setInsuranceValue("0");
              }}
            >
              <option value="none">No (or external)</option>
              <option value="leo">Leo Insurance</option>
            </select>
          </Field>

          <Field label="Insurance value (₹)">
            <input
              className={inputClass}
              type="text"
              inputMode="decimal"
              value={insuranceValue}
              disabled={insuranceProvider !== "leo"}
              onChange={numericOnly(setInsuranceValue)}
            />
          </Field>

          <Field label="Old outstanding (₹)">
            <input
              className={inputClass}
              type="text"
              inputMode="decimal"
              value={oldOutstanding}
              onChange={numericOnly(setOldOutstanding)}
              placeholder="Optional (previous dues)"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date *">
              <input
                className={inputClass}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>

            <Field label="Duration (months) *">
              <input
                className={inputClass}
                type="text"
                inputMode="numeric"
                value={durationMonths}
                onChange={(e) => {
                  if (/^\d*$/.test(e.target.value)) {
                    setDurationMonths(e.target.value);
                  }
                }}
              />
            </Field>
          </div>

          <Field label="Payment type *">
            <select
              className={inputClass}
              value={billingInterval}
              onChange={(e) =>
                setBillingInterval(
                  e.target.value as
                    | "monthly"
                    | "quarterly"
                    | "half_yearly"
                    | "yearly"
                )
              }
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half Yearly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>

          <Field label="Mode of payment">
            <select
              className={inputClass}
              value={modeOfPayment}
              onChange={(e) => setModeOfPayment(e.target.value as PaymentMode)}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </Field>

          {modeOfPayment === "other" && (
            <Field label="Specify payment mode">
              <input
                className={inputClass}
                value={customPaymentMode}
                onChange={(e) => setCustomPaymentMode(e.target.value)}
                placeholder="e.g. NEFT / IMPS / Wallet"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Company">
              <select
                className={inputClass}
                value={companyId}
                onChange={(e) =>
                  setCompanyId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Location *">
              <select
                className={inputClass}
                value={locationId}
                onChange={(e) =>
                  setLocationId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">Select location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Saving..." : "Create Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="block mb-1 font-medium">{label}</div>
      {children}
    </label>
  );
}
