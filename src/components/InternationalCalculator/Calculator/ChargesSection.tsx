// components/InternationalCalculator/ChargesSection.tsx
import React from "react";
import { BasicDetails } from "../types";

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
    <section className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Charges
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {fields.map(({ label, key, placeholder }) => (
          <div key={key}>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              {label}
            </label>
            <input
              type="number"
              step="any"
              value={data[key] as string}
              placeholder={placeholder}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
            />
          </div>
        ))}

        <div className="flex items-center space-x-2 col-span-full mt-4">
          <input
            type="checkbox"
            checked={data.calculateGSTVal}
            onChange={(e) => onChange("calculateGSTVal", e.target.checked)}
          />
          <label className="text-gray-700 dark:text-gray-300">
            Include GST (Vendor)
          </label>
        </div>
      </div>
    </section>
  );
}
