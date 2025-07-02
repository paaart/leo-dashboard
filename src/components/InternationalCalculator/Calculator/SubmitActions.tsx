// components/InternationalCalculator/SubmitActions.tsx
import React from "react";

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
    <div className="max-w-6xl mx-auto flex justify-center gap-6 mt-10">
      <button
        onClick={onSubmit}
        disabled={isDisabled}
        className={`px-6 py-3 rounded text-white font-semibold transition-colors duration-200
          ${
            isDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
      >
        Submit
      </button>

      <button
        onClick={onPrint}
        disabled={isDisabled}
        className={`px-6 py-3 rounded text-white font-semibold transition-colors duration-200
          ${
            isDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
      >
        Download PDF
      </button>
    </div>
  );
}
