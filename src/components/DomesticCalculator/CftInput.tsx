"use client";

import React from "react";
import { inputField } from "@/components/shared/ui";

interface CFTInputProps {
  value: string;
  onChange: (value: string) => void;
}

const CFTInput = ({ value, onChange }: CFTInputProps) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-fg">
        CFT <span className="text-danger">*</span>
      </label>
      <input
        type="text"
        inputMode="decimal"
        pattern="^\\d*\\.?\\d{0,4}$"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputField} h-10`}
        placeholder="Enter cubic feet"
      />
    </div>
  );
};

export default CFTInput;
