"use client";

import { Boxes, IndianRupee, Route, Truck } from "lucide-react";
import React from "react";
import { MetricCard, SectionCard } from "@/components/shared/DashboardUI";

interface QuoteSummaryProps {
  showHHG: boolean;
  showVehicle: boolean;
  packagingCost: number;
  transportCost: number;
  totalCost: number;
  leoCost: number;
  carrierCost: number;
  distance: number;
}

const QuoteSummary = ({
  showHHG,
  showVehicle,
  packagingCost,
  transportCost,
  totalCost,
  leoCost,
  carrierCost,
  distance,
}: QuoteSummaryProps) => {
  if (!showHHG && !showVehicle) return null;

  return (
    <div className="space-y-6">
      {showHHG && (
        <SectionCard
          title="Household Goods Quote"
          description="Indicative domestic HHG cost split for the selected route."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total HHG Quote"
              value={`₹${totalCost.toFixed(2)}`}
              hint="Packaging plus transportation"
              icon={<IndianRupee className="h-5 w-5" />}
            />
            <MetricCard
              label="Distance"
              value={`${distance} km`}
              hint="Route distance"
              icon={<Route className="h-5 w-5" />}
            />
            <MetricCard
              label="Packaging Cost"
              value={`₹${packagingCost.toFixed(2)}`}
              hint="Calculated from CFT"
              icon={<Boxes className="h-5 w-5" />}
            />
            <MetricCard
              label="Transportation Cost"
              value={`₹${transportCost.toFixed(2)}`}
              hint="Calculated from CFT"
              icon={<Truck className="h-5 w-5" />}
            />
          </div>
        </SectionCard>
      )}

      {showVehicle && (
        <SectionCard
          title="Vehicle Transportation Quote"
          description="Indicative vehicle movement costs for the selected route and size."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Leo Cost"
              value={`₹${leoCost.toFixed(2)}`}
              hint="Customer quote"
              icon={<IndianRupee className="h-5 w-5" />}
            />
            <MetricCard
              label="Carrier Cost"
              value={`₹${carrierCost.toFixed(2)}`}
              hint="Carrier rate"
              icon={<Truck className="h-5 w-5" />}
            />
            <MetricCard
              label="Distance"
              value={`${distance} km`}
              hint="Route distance"
              icon={<Route className="h-5 w-5" />}
            />
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default QuoteSummary;
