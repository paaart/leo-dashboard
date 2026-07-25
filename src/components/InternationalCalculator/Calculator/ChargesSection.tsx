// components/InternationalCalculator/ChargesSection.tsx
import React from "react";
import { BasicDetails } from "../types";
import { SectionCard } from "@/components/shared/DashboardUI";
import { inputField } from "@/components/shared/ui";

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
            <label className="block text-sm font-medium text-fg">
              {label}
            </label>
            <input
              type="number"
              step="any"
              value={data[key] as string}
              placeholder={placeholder}
              onChange={(e) => onChange(key, e.target.value)}
              className={`${inputField} h-10`}
            />
          </div>
        ))}

        <label className="col-span-full flex min-h-12 items-center gap-3 rounded-lg border border-edge bg-surface-2 px-4 text-sm font-medium text-fg-muted">
          <input
            type="checkbox"
            checked={data.calculateGSTVal}
            onChange={(e) => onChange("calculateGSTVal", e.target.checked)}
            className="h-4 w-4 rounded border-edge-strong text-accent focus:ring-accent"
          />
          <span>Include GST (Vendor)</span>
        </label>
      </div>
    </SectionCard>
  );
}
