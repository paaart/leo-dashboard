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
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
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
