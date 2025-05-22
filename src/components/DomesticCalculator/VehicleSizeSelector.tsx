"use client";

import React from "react";

interface VehicleSizeSelectorProps {
  carSize: string;
  carOptions: Record<string, { leo_cost: number; carrier_cost: number }>;
  onChange: (value: string) => void;
}
const carSizeExamples = {
  "Small Hatch": "Alto, Santro, Kwid, Celerio, Tiago, Wagon R",
  Hatch: "i20, Baleno/Fronx, Polo, i10, Swift, Altroz, Glanza",
  "Small Sedan": "Amaze, Dzire, Xcent, Etios, Tigor",
  "Small SUV":
    "Venue, Breeza, Punch, Nexon, Sonet, XUV300, Magnite/Kiger, BRV/WRV",
  "Large Sedan":
    "Civic, Corolla, Accord, City, Verna, Vento/Virtus, Rapid/Slavia, Ciaz",
  "Mid SUV":
    "Creta/Alcazar, Seltos, Grand Vitara, Taigun/Kushaq, Elevate, XUV500, Hyryder, Astor",
  "Large SUV":
    "XUV700/500, Scorpio/Thar, Harrier/Safari, Fortuner, Compass, Hector, Meridian, Tiguan",
  MPV: "Innova/Crysta, Ertiga/XL6, Carens, Hycross",
  "Luxury Sedan":
    "Audi A4/A6, BMW 3/5 Series, Mercedes C Class, Octavia/Superb, Camry, Accord, Jaguar, Lexus",
  "Luxury SUV":
    "Audi Q3/Q5, BMW X1/X3, Mercedes G-Class, Kodiaq, Range Rover, Discovery/Defender",
};

const VehicleSizeSelector = ({
  carSize,
  carOptions,
  onChange,
}: VehicleSizeSelectorProps) => {
  const sizeOptions = Object.keys(carOptions);

  return (
    <div className="mb-4">
      <label className="block mb-1 font-medium">
        Car Size <span className="text-red-500">*</span>
      </label>
      <select
        value={carSize}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border px-4 py-2 rounded bg-white dark:bg-gray-700"
      >
        <option value="">
          {sizeOptions.length !== 0
            ? "Select vehicle size"
            : "No car sizes available for the selected route"}
        </option>
        {sizeOptions.map((size) => {
          const examples =
            carSizeExamples[size as keyof typeof carSizeExamples] || "";
          return (
            <option key={size} value={size}>
              {size} {examples ? ` (${examples})` : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default VehicleSizeSelector;
