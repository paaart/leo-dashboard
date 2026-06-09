// components/InternationalCalculator/ChargesSection.tsx
import React from "react";
import { BasicDetails } from "../types";
import { SectionCard } from "@/components/shared/DashboardUI";

type Props = {
  data: BasicDetails;
  onChange: (key: keyof BasicDetails, value: string | boolean) => void;
};

const fields = [
  {
    label: "Packing Charges",
    key: "packingCharges",
    placeholder: "Enter cost",
  },
  {
    label: "Handling & transportation till port",
    key: "handlingCharges",
    placeholder: "Enter cost",
  },
  {
    label: "Origin Charges Custom",
    key: "originChargesCustom",
    placeholder: "Enter cost",
  },
  { label: "Ocean freight", key: "oceanFreight", placeholder: "Enter cost" },
  { label: "DTHC", key: "dthc", placeholder: "Enter cost" },
  {
    label: "Destination charges",
    key: "destination",
    placeholder: "Enter cost",
  },
] as const;

export default function ChargesSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Cost Sections"
      description="Enter origin, freight, destination, and vendor tax inputs used by the quote."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(({ label, key, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              {label}
            </label>
            <input
              type="number"
              step="any"
              value={data[key] as string}
              placeholder={placeholder}
              onChange={(e) => onChange(key, e.target.value)}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500"
            />
          </div>
        ))}

        <label className="col-span-full flex min-h-12 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          <input
            type="checkbox"
            checked={data.calculateGSTVal}
            onChange={(e) => onChange("calculateGSTVal", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700"
          />
          <span>Include GST (Vendor)</span>
        </label>
      </div>
    </SectionCard>
  );
}
