"use client";

import {
  buttonDanger,
  buttonSecondary,
  modalOverlay,
  modalPanel,
} from "@/components/shared/ui";

type CloseCycleConfirmModalProps = {
  open: boolean;
  closing: boolean;
  clientName: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function CloseCycleConfirmModal({
  open,
  closing,
  clientName,
  onClose,
  onConfirm,
}: CloseCycleConfirmModalProps) {
  if (!open) return null;

  return (
    <div className={modalOverlay}>
      <div className={`${modalPanel} max-h-[90vh] max-w-md overflow-y-auto p-6`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-danger">
            Close Cycle?
          </h3>
          <p className="mt-2 text-sm text-fg-muted">
            You are about to close the active cycle for{" "}
            <span className="font-medium">{clientName}</span>.
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            After closing:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg-muted">
            <li>The current ledger becomes read-only</li>
            <li>No more edits can be made to that cycle</li>
            <li>You will need to renew to start a new active cycle</li>
          </ul>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={closing}
            className={buttonSecondary}
          >
            Cancel
          </button>

          <button
            onClick={() => void onConfirm()}
            disabled={closing}
            className={buttonDanger}
          >
            {closing ? "Closing..." : "Yes, Close Cycle"}
          </button>
        </div>
      </div>
    </div>
  );
}
