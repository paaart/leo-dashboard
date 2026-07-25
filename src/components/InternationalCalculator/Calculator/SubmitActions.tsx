// components/InternationalCalculator/SubmitActions.tsx
import React from "react";
import { Download, Save } from "lucide-react";
import { buttonPrimary, buttonSecondary } from "@/components/shared/ui";

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
    <div className="flex flex-col gap-3 rounded-xl border border-edge bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={onSubmit}
        disabled={isDisabled}
        className={buttonPrimary}
      >
        <Save className="h-4 w-4" />
        Save Quote
      </button>

      <button
        type="button"
        onClick={onPrint}
        disabled={isDisabled}
        className={buttonSecondary}
      >
        <Download className="h-4 w-4" />
        Download PDF
      </button>
    </div>
  );
}
