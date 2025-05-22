"use client";

import React from "react";

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
    <div className="mb-4">
      <label className="block mb-1 font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border px-4 py-2 rounded bg-white dark:bg-gray-700"
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
