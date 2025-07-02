"use client";

import React, { useState } from "react";
import { BasicDetails } from "../types";
import HistoryItem from "./HistoryItem";
import PdfPreviewModal from "./PdfPreviewModal";

const dummyData: BasicDetails[] = [
  {
    customerName: "Amit Shah",
    destinationCity: "London",
    createdAt: "2025-06-28",
    originCity: "Chennai",
    originPort: "Chennai",
    destinationCountry: "USA",
    destinationPort: "New York",
    mode: "FCL",
    volumeInCBM: "234",
    packingCharges: "234",
    handlingCharges: "234",
    originChargesCustom: "234",
    oceanFreight: "234",
    dthc: "234",
    destination: "234",
    calculateGSTVal: true,
  },
  {
    customerName: "Meera Nair",
    destinationCity: "New York",
    createdAt: "2025-06-26",
    originCity: "Mumbai",
    originPort: "",
    destinationCountry: "",
    destinationPort: "",
    mode: "",
    packingCharges: "",
    handlingCharges: "",
    originChargesCustom: "",
    oceanFreight: "",
    dthc: "",
    destination: "",
    calculateGSTVal: false,
    volumeInCBM: "",
  },
];

export default function HistoryView() {
  const [selectedEntry, setSelectedEntry] = useState<BasicDetails | null>(null);

  return (
    <div className="p-8 space-y-4 overflow-auto h-full bg-white dark:bg-[#23272f] min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">
        History
      </h1>
      {dummyData.map((entry, idx) => (
        <HistoryItem
          key={idx}
          entry={entry}
          onClick={() => setSelectedEntry(entry)}
        />
      ))}

      {selectedEntry && (
        <PdfPreviewModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
