"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { updateWarehouseClient } from "@/lib/warehouse/ledger";
import {
  buttonGhost,
  buttonPrimary,
  fieldLabel,
  inputField,
  modalOverlay,
  modalPanel,
  modalTitle,
  selectField,
} from "@/components/shared/ui";

export default function EditPodModal({
  podId,
  initial,
  onClose,
  onSaved,
}: {
  podId: string;
  initial: {
    name: string;
    email: string;
    contact: string;
    location: string;
    rate: string;
    durationMonths: string;
    billingInterval: "monthly" | "yearly" | "quarterly" | "half_yearly";
    modeOfPayment: string;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [contact, setContact] = useState(initial.contact);
  const [location, setLocation] = useState(initial.location);
  const [rate, setRate] = useState(initial.rate);
  const [durationMonths, setDurationMonths] = useState(initial.durationMonths);
  const [billingInterval, setBillingInterval] = useState(
    initial.billingInterval
  );
  const [modeOfPayment, setModeOfPayment] = useState(initial.modeOfPayment);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim() || !contact.trim() || !rate || isNaN(Number(rate))) {
      toast.error("Please fill required fields");
      return;
    }

    setLoading(true);
    try {
      await updateWarehouseClient({
        podId,
        name: name.trim(),
        email: email.trim() || null,
        contact: contact.trim(),
        locationName: location,
        rate: Number(rate),
        durationMonths: Number(durationMonths),
        billingInterval,
        modeOfPayment: modeOfPayment.trim() || null,
      });

      toast.success("Updated ✅");
      onSaved();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${modalOverlay} z-60`}>
      <div className={`${modalPanel} max-h-[90vh] max-w-lg overflow-y-auto p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={modalTitle}>Edit Client</h3>
          <button onClick={onClose} className={buttonGhost}>
            Close
          </button>
        </div>

        <div className="grid gap-3">
          <Field label="Name *">
            <input
              className={inputField}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Contact *">
            <input
              className={inputField}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputField}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Location">
            <input
              className={inputField}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Rate *">
              <input
                className={inputField}
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </Field>
            <Field label="Duration months *">
              <input
                className={inputField}
                type="number"
                min={1}
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Payment type">
            <select
              className={selectField}
              value={billingInterval}
              onChange={(e) =>
                setBillingInterval(e.target.value as "monthly" | "yearly")
              }
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>

          <Field label="Mode of payment">
            <input
              className={inputField}
              value={modeOfPayment}
              onChange={(e) => setModeOfPayment(e.target.value)}
            />
          </Field>

          <button
            onClick={save}
            disabled={loading}
            className={buttonPrimary}
          >
            {loading ? "Saving..." : "Save"}
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
      <div className={fieldLabel}>{label}</div>
      {children}
    </label>
  );
}
