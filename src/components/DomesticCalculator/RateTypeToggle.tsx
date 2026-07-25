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
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex min-h-12 items-center gap-3 rounded-lg border border-edge bg-surface-2 px-4 text-sm font-medium text-fg-muted">
        <input
          type="checkbox"
          name="houseRate"
          checked={houseRate}
          onChange={(e) => onChange("houseRate", e.target.checked)}
          className="h-4 w-4 rounded border-edge-strong text-accent focus:ring-accent"
        />
        <span>Household Goods</span>
      </label>
      <label className="flex min-h-12 items-center gap-3 rounded-lg border border-edge bg-surface-2 px-4 text-sm font-medium text-fg-muted">
        <input
          type="checkbox"
          name="carRate"
          checked={carRate}
          onChange={(e) => onChange("carRate", e.target.checked)}
          className="h-4 w-4 rounded border-edge-strong text-accent focus:ring-accent"
        />
        <span>Vehicle Transportation</span>
      </label>
    </div>
  );
};

export default RateTypeToggle;
