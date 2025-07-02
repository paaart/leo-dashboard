"use client";

import React from "react";

interface RateTypeToggleProps {
  houseRate: boolean;
  carRate: boolean;
  onChange: (type: "houseRate" | "carRate", checked: boolean) => void;
}

const RateTypeToggle = ({
  houseRate,
  carRate,
  onChange,
}: RateTypeToggleProps) => {
  return (
    <div className="checkboxes text-gray-600 dark:text-gray-400 mb-4 flex gap-6">
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="houseRate"
          checked={houseRate}
          onChange={(e) => onChange("houseRate", e.target.checked)}
        />
        <span>Household Goods</span>
      </label>
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="carRate"
          checked={carRate}
          onChange={(e) => onChange("carRate", e.target.checked)}
        />
        <span>Vehicle Transportation</span>
      </label>
    </div>
  );
};

export default RateTypeToggle;
