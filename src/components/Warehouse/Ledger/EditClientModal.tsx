"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { updateWarehouseClient } from "@/lib/warehouse/ledger";
import {
  buttonPrimary,
  buttonSecondary,
  fieldLabel,
  inputField,
  modalOverlay,
  modalPanel,
  modalTitle,
} from "@/components/shared/ui";

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

  const inputClass = inputField;

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
    <div className={modalOverlay}>
      <div className={`${modalPanel} max-h-[90vh] max-w-lg overflow-y-auto p-6`}>
        <div className="mb-4">
          <h3 className={modalTitle}>Edit Client Details</h3>
          <p className="text-sm text-fg-muted">
            Update name, email and contact
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className={fieldLabel}>Name</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
            />
          </div>

          <div>
            <label className={fieldLabel}>Email</label>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@email.com"
            />
          </div>

          <div>
            <label className={fieldLabel}>Contact</label>
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
            className={buttonSecondary}
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={saving}
            className={buttonPrimary}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
