// components/InternationalCalculator/SubmitActions.tsx
import React from "react";
import { Download, Save } from "lucide-react";

type Props = {
  onSubmit: () => void;
  onPrint: () => void;
  isDisabled: boolean;
};

export default function SubmitActions({
  onSubmit,
  onPrint,
  isDisabled,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={onSubmit}
        disabled={isDisabled}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        Save Quote
      </button>

      <button
        type="button"
        onClick={onPrint}
        disabled={isDisabled}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </button>
    </div>
  );
}
