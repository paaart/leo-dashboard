"use client";

import React from "react";

interface CFTInputProps {
  value: string;
  onChange: (value: string) => void;
}

const CFTInput = ({ value, onChange }: CFTInputProps) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
        CFT <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        inputMode="decimal"
        pattern="^\\d*\\.?\\d{0,4}$"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500"
        placeholder="Enter cubic feet"
      />
    </div>
  );
};

export default CFTInput;
