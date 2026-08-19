"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

import {
  CreatePodBody,
  createWarehousePod,
  getWarehouseOptions,
} from "@/lib/warehouse/pods";
import type { BillingInterval, InsuranceProvider } from "@/lib/warehouse/types";
import { PageHeader, SectionCard } from "@/components/shared/DashboardUI";
import {
  buttonPrimary,
  fieldLabel,
  inputField,
} from "@/components/shared/ui";

type Option = { id: number; name: string; is_active?: boolean };

export type PaymentMode =
  | "cash"
  | "upi"
  | "bank_transfer"
  | "cheque"
  | "card"
  | "other";

export default function WarehouseAddClient() {
  const todayISO = new Date().toISOString().split("T")[0];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [rate, setRate] = useState("");

  const [startDate, setStartDate] = useState(() => todayISO);
  const [billingStartDate, setBillingStartDate] = useState(() => todayISO);
  const [useCustomBillingStart, setUseCustomBillingStart] = useState(false);

  const [durationMonths, setDurationMonths] = useState("12");

  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");
  const [insuranceProvider, setInsuranceProvider] =
    useState<InsuranceProvider>("none");

  const [modeOfPayment, setModeOfPayment] = useState<PaymentMode>("cash");
  const [customPaymentMode, setCustomPaymentMode] = useState("");

  const [companies, setCompanies] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [companyId, setCompanyId] = useState<number | "">("");
  const [locationId, setLocationId] = useState<number | "">("");

  const [insuranceValue, setInsuranceValue] = useState("0");
  const [insuranceIdv, setInsuranceIdv] = useState("0");
  const [oldOutstanding, setOldOutstanding] = useState("");
  const [loading, setLoading] = useState(false);

  const inputClass = inputField;

  useEffect(() => {
    if (!useCustomBillingStart) setBillingStartDate(startDate);
  }, [useCustomBillingStart, startDate]);

  const numericOnly =
    (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (/^\d*\.?\d*$/.test(value)) setter(value);
    };

  const signedNumericOnly =
    (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (/^-?\d*\.?\d*$/.test(value)) setter(value);
    };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const data = await getWarehouseOptions();
        setCompanies(data.companies as Option[]);
        setLocations(data.locations as Option[]);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to load options");
        setCompanies([]);
        setLocations([]);
      }
    };

    void fetchOptions();
  }, []);

  const handleSubmit = async () => {
    if (
      !name.trim() ||
      !contact.trim() ||
      !rate ||
      Number.isNaN(Number(rate))
    ) {
      toast.error("Please fill required fields");
      return;
    }

    if (locationId === "") {
      toast.error("Please select Location");
      return;
    }

    if (oldOutstanding.trim() !== "" && Number.isNaN(Number(oldOutstanding))) {
      toast.error("Opening balance must be a valid number");
      return;
    }

    const insVal = insuranceProvider === "leo" ? Number(insuranceValue) : 0;
    const idv = insuranceProvider === "leo" ? Number(insuranceIdv) : 0;

    if (insuranceProvider === "leo" && (Number.isNaN(insVal) || insVal < 0)) {
      toast.error("Insurance value must be valid");
      return;
    }
    if (insuranceProvider === "leo" && (Number.isNaN(idv) || idv < 0)) {
      toast.error("IDV must be valid");
      return;
    }

    setLoading(true);

    const run = async () => {
      const payload: CreatePodBody = {
        name: name.trim(),
        email: email.trim() || null,
        contact: contact.trim(),

        company_id: companyId === "" ? null : Number(companyId),
        location_id: Number(locationId),

        start_date: startDate,
        billing_start_date: billingStartDate,

        duration_months: Number(durationMonths),
        billing_interval: billingInterval,
        rate: Number(rate),

        mode_of_payment:
          modeOfPayment === "other"
            ? customPaymentMode.trim() || "other"
            : modeOfPayment,

        insurance_provider: insuranceProvider,
        insurance_value: insVal,
        insurance_idv: idv,

        old_outstanding: Number(oldOutstanding || 0),
      };

      const { client_id } = await createWarehousePod(payload);
      return client_id;
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
      setDurationMonths("12");
      setBillingInterval("monthly");
      setCompanyId("");
      setLocationId("");
      setStartDate(todayISO);
      setUseCustomBillingStart(false);
      setBillingStartDate(todayISO);
      setModeOfPayment("cash");
      setCustomPaymentMode("");
      setInsuranceProvider("none");
      setInsuranceValue("0");
      setInsuranceIdv("0");
      setOldOutstanding("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Storage"
          title="Warehouse Management"
          subtitle="Manage warehouse clients, PODs, billing, payments, and storage ledgers."
        />

        <SectionCard
          title="Create / Add Client"
          description="Create a warehouse POD with client, billing, insurance, and opening balance details."
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-fg">
                Client Details
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
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
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg">
                Storage / POD Details
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
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
                      setLocationId(
                        e.target.value ? Number(e.target.value) : ""
                      )
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
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg">
                Billing Details
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Amount (cost per month) *">
                  <input
                    className={inputClass}
                    type="text"
                    inputMode="decimal"
                    value={rate}
                    onChange={numericOnly(setRate)}
                    placeholder="e.g. 2500"
                  />
                </Field>

                <Field label="Duration (months) *">
                  <input
                    className={inputClass}
                    type="text"
                    inputMode="numeric"
                    value={durationMonths}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value))
                        setDurationMonths(e.target.value);
                    }}
                  />
                </Field>

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
                    onChange={(e) =>
                      setModeOfPayment(e.target.value as PaymentMode)
                    }
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
              </div>
            </div>

            <div className="rounded-xl border border-edge bg-surface-2 p-4">
              <div className="mb-3">
                <div className="text-sm font-semibold text-fg">
                  Billing Dates
                </div>
                <p className="mt-1 text-xs text-fg-muted">
                  Storage start is for records. Billing start controls when
                  auto-charges begin.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Storage start date (can be old)">
                  <input
                    className={inputClass}
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Field>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-surface px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-fg">
                      Separate billing start date
                    </div>
                    <div className="text-xs text-fg-muted">
                      Migration only
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setUseCustomBillingStart((v) => !v)}
                    className={[
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition",
                      useCustomBillingStart
                        ? "bg-accent"
                        : "bg-edge-strong",
                    ].join(" ")}
                    aria-pressed={useCustomBillingStart}
                  >
                    <span
                      className={[
                        "inline-block h-5 w-5 transform rounded-full bg-white transition",
                        useCustomBillingStart
                          ? "translate-x-5"
                          : "translate-x-1",
                      ].join(" ")}
                    />
                  </button>
                </div>
              </div>

              {useCustomBillingStart && (
                <div className="mt-4">
                  <Field label="Billing start date (charges start)">
                    <input
                      className={inputClass}
                      type="date"
                      value={billingStartDate}
                      onChange={(e) => setBillingStartDate(e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg">
                GST / Tax & Insurance Details
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <Field label="Insurance">
                  <select
                    className={inputClass}
                    value={insuranceProvider}
                    onChange={(e) => {
                      const v = e.target.value as "none" | "leo";
                      setInsuranceProvider(v);
                      if (v !== "leo") {
                        setInsuranceValue("0");
                        setInsuranceIdv("0");
                      }
                    }}
                  >
                    <option value="none">No (or external)</option>
                    <option value="leo">Leo Insurance</option>
                  </select>
                </Field>

                <Field label="IDV">
                  <input
                    className={inputClass}
                    type="text"
                    inputMode="decimal"
                    value={insuranceIdv}
                    disabled={insuranceProvider !== "leo"}
                    onChange={numericOnly(setInsuranceIdv)}
                    placeholder="e.g. 500000"
                  />
                </Field>

                <Field label="Insurance value">
                  <input
                    className={inputClass}
                    type="text"
                    inputMode="decimal"
                    value={insuranceValue}
                    disabled={insuranceProvider !== "leo"}
                    onChange={numericOnly(setInsuranceValue)}
                  />
                </Field>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg">
                Opening Balance / Remarks
              </h3>
              <div className="mt-3 max-w-xl">
                <Field label="Opening balance">
                  <input
                    className={inputClass}
                    type="text"
                    inputMode="decimal"
                    value={oldOutstanding}
                    onChange={signedNumericOnly(setOldOutstanding)}
                    placeholder="Use negative for advance, e.g. -5000"
                  />
                  <p className="mt-1 text-xs text-fg-muted">
                    Positive means customer owes money. Negative means customer
                    has advance balance.
                  </p>
                </Field>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-edge pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-fg-muted">
                Required fields are name, contact, rate, and location.
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={buttonPrimary}
              >
                {loading ? "Saving..." : "Create Client"}
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className={fieldLabel}>
        {label}
      </div>
      {children}
    </label>
  );
}
