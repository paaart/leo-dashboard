// components/InternationalCalculator/ClientInfoSection.tsx
import React from "react";
import { BasicDetails } from "../types";
import { SectionCard } from "@/components/shared/DashboardUI";

type Props = {
  data: BasicDetails;
  onChange: (key: keyof BasicDetails, value: string) => void;
};

const fields = [
  {
    label: "Customer Name",
    key: "customerName",
    placeholder: "Enter customer name",
  },
  { label: "Origin City", key: "originCity", placeholder: "Enter origin city" },
  { label: "Origin Port", key: "originPort", placeholder: "Enter origin port" },
  {
    label: "Destination City",
    key: "destinationCity",
    placeholder: "Enter destination city",
  },
  {
    label: "Destination Country",
    key: "destinationCountry",
    placeholder: "Enter destination country",
  },
  {
    label: "Destination Port",
    key: "destinationPort",
    placeholder: "Enter destination port",
  },
  { label: "Mode", key: "mode", placeholder: "FCL or LCL" },
  { label: "Volume in CBM", placeholder: "Enter volume", key: "volumeInCBM" },
] as const;

export default function ClientInfoSection({ data, onChange }: Props) {
  return (
    <SectionCard
      title="Customer & Shipment Details"
      description="Capture the customer, route, mode, and shipment volume for this international quote."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(({ label, key, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              {label}
            </label>
            <input
              type="text"
              value={data[key]}
              placeholder={placeholder}
              onChange={(e) => onChange(key, e.target.value)}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500"
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
