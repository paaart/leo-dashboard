"use client";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-[#1f2933]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
            Close Cycle?
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            You are about to close the active cycle for{" "}
            <span className="font-medium">{clientName}</span>.
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            After closing:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
            <li>The current ledger becomes read-only</li>
            <li>No more edits can be made to that cycle</li>
            <li>You will need to renew to start a new active cycle</li>
          </ul>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={closing}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-70 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>

          <button
            onClick={() => void onConfirm()}
            disabled={closing}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70"
          >
            {closing ? "Closing..." : "Yes, Close Cycle"}
          </button>
        </div>
      </div>
    </div>
  );
}
