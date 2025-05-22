"use client";

import Image from "next/image";
import React from "react";

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
    <div className="mt-6 space-y-6">
      {showHHG && (
        <div className="p-4 border rounded bg-gray-100 dark:bg-gray-800">
          <div className="flex justify-between mb-2">
            <h1 className="text-lg font-semibold">
              Total HHG Quote: ₹{totalCost.toFixed(2)}
            </h1>
            <h1 className="text-lg font-semibold">
              Total Distance: {distance} km
            </h1>
          </div>
          <div className="text-[18px]">
            📦 Packaging Cost: ₹{packagingCost.toFixed(2)}
          </div>
          <div className="text-[18px]">
            🚚 Transportation Cost: ₹{transportCost.toFixed(2)}
          </div>
        </div>
      )}

      {showVehicle && (
        <div className="p-4 border rounded bg-gray-100 dark:bg-gray-800">
          <div className="flex justify-between mb-2">
            <h2 className="text-lg font-semibold mb-2">
              Vehicle Transportation Quote
            </h2>
            <h1 className="text-lg font-semibold">
              Total Distance: {distance} km
            </h1>
          </div>
          <div className="flex text-[18px]">
            <Image
              src="/favicon.png"
              alt="Leo Cost Icon"
              className="w-5 h-5 mr-2"
              width={18}
              height={18}
            />
            Leo Cost: ₹{leoCost.toFixed(2)}
          </div>
          <div className="text-[18px]">
            🟨 Carrier Cost: ₹{carrierCost.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteSummary;
