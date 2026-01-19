"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { getErrorMessage } from "@/lib/errors";

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
      const { error } = await supabase
        .from("warehouse_pods")
        .update({
          name: name.trim(),
          email: email.trim() ? email.trim() : null,
          contact: contact.trim(),
          location: location.trim() ? location.trim() : null,
          rate: Number(rate),
          duration_months: Number(durationMonths),
          billing_interval: billingInterval,
          mode_of_payment: modeOfPayment.trim() ? modeOfPayment.trim() : null,
        })
        .eq("id", podId);

      if (error) throw error;

      toast.success("Updated ✅");
      onSaved();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-[#1f2933]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Client</h3>
          <button onClick={onClose} className="text-sm underline">
            Close
          </button>
        </div>

        <div className="grid gap-3">
          <Field label="Name *">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Contact *">
            <input
              className="input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Location">
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate *">
              <input
                className="input"
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </Field>
            <Field label="Duration months *">
              <input
                className="input"
                type="number"
                min={1}
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Payment type">
            <select
              className="input"
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
              className="input"
              value={modeOfPayment}
              onChange={(e) => setModeOfPayment(e.target.value)}
            />
          </Field>

          <button
            onClick={save}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>

        <style jsx global>{`
          .input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid rgb(209 213 219);
            border-radius: 0.375rem;
            background: white;
          }
          .dark .input {
            background: rgb(31 41 55);
            border-color: rgb(55 65 81);
            color: white;
          }
        `}</style>
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
