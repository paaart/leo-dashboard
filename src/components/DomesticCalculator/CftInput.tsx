"use client";

import React from "react";

interface CFTInputProps {
  value: string;
  onChange: (value: string) => void;
}

const CFTInput = ({ value, onChange }: CFTInputProps) => {
  return (
    <div className="mb-4">
      <label className="block mb-1 font-medium">
        CFT <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        inputMode="decimal"
        pattern="^\\d*\\.?\\d{0,4}$"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border px-4 py-2 rounded bg-white dark:bg-gray-700"
        placeholder="Enter cubic feet"
      />
    </div>
  );
};

export default CFTInput;
