"use client";

import React from "react";
import { selectField } from "@/components/shared/ui";

interface CitySelectorProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

const CitySelector = ({
  label,
  value,
  options,
  onChange,
}: CitySelectorProps) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-fg">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${selectField} h-10`}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CitySelector;
