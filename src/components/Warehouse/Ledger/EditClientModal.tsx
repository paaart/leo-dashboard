"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { updateWarehouseClient } from "@/lib/warehouse/ledger";

type EditClientModalProps = {
  open: boolean;
  podId: string;
  defaultName: string;
  defaultEmail?: string | null;
  defaultContact: string;
  onClose: () => void;
  onDone: () => Promise<void> | void;
};

export default function EditClientModal({
  open,
  podId,
  defaultName,
  defaultEmail,
  defaultContact,
  onClose,
  onDone,
}: EditClientModalProps) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [contact, setContact] = useState(defaultContact);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setEmail(defaultEmail ?? "");
    setContact(defaultContact);
  }, [open, defaultName, defaultEmail, defaultContact]);

  if (!open) return null;

  const inputClass =
    "w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

  const save = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedContact = contact.trim();

    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }

    if (!trimmedContact) {
      toast.error("Contact is required");
      return;
    }

    setSaving(true);

    try {
      await toast.promise(
        updateWarehouseClient({
          podId,
          name: trimmedName,
          email: trimmedEmail || null,
          contact: trimmedContact,
        }),
        {
          loading: "Saving client details...",
          success: "Client updated ✅",
          error: (e) => getErrorMessage(e) || "Failed to update client",
        }
      );

      await onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-[#1f2933]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Edit Client Details</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Update name, email and contact
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-medium">Name</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium">Email</label>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium">Contact</label>
            <input
              className={inputClass}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Contact number"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-70 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
