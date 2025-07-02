// components/InternationalCalculator/ClientInfoSection.tsx
import React from "react";
import { BasicDetails } from "../types";

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
    <section className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Client & Shipping Info
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {fields.map(({ label, key, placeholder }) => (
          <div key={key}>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              {label}
            </label>
            <input
              type="text"
              value={data[key]}
              placeholder={placeholder}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
