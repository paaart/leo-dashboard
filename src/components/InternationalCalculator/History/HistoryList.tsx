"use client";

import React, { useState, useEffect } from "react";
import { BasicDetails } from "../types";
import PdfPreviewModal from "./PdfPreviewModal";
import { fetchInternationalQuote } from "@/lib/api";
import { computeDerivedValues } from "../helpers";

// Header definitions and mapping to data (copied from HistoryItem)
const HEADERS: {
  label: string;
  getValue: (
    entry: BasicDetails,
    calculated: Record<string, Record<string, string>>
  ) => string;
}[] = [
  {
    label: "Date",
    getValue: (e) =>
      e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "",
  },
  { label: "Customer Name", getValue: (e) => e.customerName },
  { label: "Origin City", getValue: (e) => e.originCity },
  { label: "Origin Port", getValue: (e) => e.originPort },
  { label: "Destination City", getValue: (e) => e.destinationCity },
  { label: "Destination Country", getValue: (e) => e.destinationCountry },
  { label: "Destination Port", getValue: (e) => e.destinationPort },
  { label: "Mode", getValue: (e) => e.mode },
  { label: "Volume in CBM", getValue: (e) => String(e.volumeInCBM) },
  { label: "Packing Charges", getValue: (e) => e.packingCharges },
  {
    label: "Handling & transportation till port",
    getValue: (e) => e.handlingCharges,
  },
  { label: "Origin Charges Custom", getValue: (e) => e.originChargesCustom },
  {
    label: "Origin charges GST (vendor)",
    getValue: (e, c) => c["10%"].gstOrigin,
  },
  {
    label: "Orgin charges Margin(10%)",
    getValue: (e, c) => c["10%"].marginOrigin,
  },
  {
    label: "Orgin charges Margin(20%)",
    getValue: (e, c) => c["20%"].marginOrigin,
  },
  {
    label: "Orgin charges Margin(25%)",
    getValue: (e, c) => c["25%"].marginOrigin,
  },
  {
    label: "Orgin charges Margin(30%)",
    getValue: (e, c) => c["30%"].marginOrigin,
  },
  { label: "Ocean freight", getValue: (e) => e.oceanFreight },
  {
    label: "Ocean freight GST (Vendor)",
    getValue: (e, c) => c["10%"].gstFreight,
  },
  {
    label: "Ocean freight Margin(10%)",
    getValue: (e, c) => c["10%"].marginFreight,
  },
  {
    label: "Ocean freight Margin(20%)",
    getValue: (e, c) => c["20%"].marginFreight,
  },
  {
    label: "Ocean freight Margin(25%)",
    getValue: (e, c) => c["25%"].marginFreight,
  },
  {
    label: "Ocean freight Margin(30%)",
    getValue: (e, c) => c["30%"].marginFreight,
  },
  { label: "DTHC", getValue: (e) => e.dthc },
  { label: "Destination charges", getValue: (e) => e.destination },
  {
    label: "Total Destination charges(10%)",
    getValue: (e, c) => c["10%"].totalDest,
  },
  {
    label: "Total Destination charges(20%)",
    getValue: (e, c) => c["20%"].totalDest,
  },
  {
    label: "Total Destination charges(25%)",
    getValue: (e, c) => c["25%"].totalDest,
  },
  {
    label: "Total Destination charges(30%)",
    getValue: (e, c) => c["30%"].totalDest,
  },
  {
    label: "Total Destination charges GST (vendor)(10%)",
    getValue: (e, c) => c["10%"].gstDest,
  },
  {
    label: "Total Destination charges GST (vendor)(20%)",
    getValue: (e, c) => c["20%"].gstDest,
  },
  {
    label: "Total Destination charges GST (vendor)(25%)",
    getValue: (e, c) => c["25%"].gstDest,
  },
  {
    label: "Total Destination charges GST (vendor)(30%)",
    getValue: (e, c) => c["30%"].gstDest,
  },
  {
    label: "Total Destination charges margin(10%)",
    getValue: (e, c) => c["10%"].marginDest,
  },
  {
    label: "Total Destination charges margin(20%)",
    getValue: (e, c) => c["20%"].marginDest,
  },
  {
    label: "Total Destination charges margin(25%)",
    getValue: (e, c) => c["25%"].marginDest,
  },
  {
    label: "Total Destination charges margin(30%)",
    getValue: (e, c) => c["30%"].marginDest,
  },
  { label: "Net Total (10%)", getValue: (e, c) => c["10%"].netTotal },
  { label: "Net Total (20%)", getValue: (e, c) => c["20%"].netTotal },
  { label: "Net Total (25%)", getValue: (e, c) => c["25%"].netTotal },
  { label: "Net Total (30%)", getValue: (e, c) => c["30%"].netTotal },
  {
    label: "Leo GST (All services except freight) - 18% (10%)",
    getValue: (e, c) => c["10%"].leoGSTALL,
  },
  {
    label: "Leo GST (All services except freight) - 18% (20%)",
    getValue: (e, c) => c["20%"].leoGSTALL,
  },
  {
    label: "Leo GST (All services except freight) - 18% (25%)",
    getValue: (e, c) => c["25%"].leoGSTALL,
  },
  {
    label: "Leo GST (All services except freight) - 18% (30%)",
    getValue: (e, c) => c["30%"].leoGSTALL,
  },
  {
    label: "LEO GST for Freight - 5% (10%)",
    getValue: (e, c) => c["10%"].leoGSTFreight,
  },
  {
    label: "LEO GST for Freight - 5% (20%)",
    getValue: (e, c) => c["20%"].leoGSTFreight,
  },
  {
    label: "LEO GST for Freight - 5% (25%)",
    getValue: (e, c) => c["25%"].leoGSTFreight,
  },
  {
    label: "LEO GST for Freight - 5% (30%)",
    getValue: (e, c) => c["30%"].leoGSTFreight,
  },
  { label: "Total GST(10%)", getValue: (e, c) => c["10%"].totalGST },
  { label: "Total GST(20%)", getValue: (e, c) => c["20%"].totalGST },
  { label: "Total GST(25%)", getValue: (e, c) => c["25%"].totalGST },
  { label: "Total GST(30%)", getValue: (e, c) => c["30%"].totalGST },
  { label: "Total(net+gst)(10%)", getValue: (e, c) => c["10%"].total },
  { label: "Total(net+gst)(20%)", getValue: (e, c) => c["20%"].total },
  { label: "Total(net+gst)(25%)", getValue: (e, c) => c["25%"].total },
  { label: "Total(net+gst)(30%)", getValue: (e, c) => c["30%"].total },
  { label: "Input credit(10%)", getValue: (e, c) => c["10%"].inputCredit },
  { label: "Input credit(20%)", getValue: (e, c) => c["20%"].inputCredit },
  { label: "Input credit(25%)", getValue: (e, c) => c["25%"].inputCredit },
  { label: "Input credit(30%)", getValue: (e, c) => c["30%"].inputCredit },
  {
    label: "Margin(for reference)(10%)",
    getValue: (e, c) => c["10%"].combinedMargin,
  },
  {
    label: "Margin(for reference)(20%)",
    getValue: (e, c) => c["20%"].combinedMargin,
  },
  {
    label: "Margin(for reference)(25%)",
    getValue: (e, c) => c["25%"].combinedMargin,
  },
  {
    label: "Margin(for reference)(30%)",
    getValue: (e, c) => c["30%"].combinedMargin,
  },
  { label: "GST to Pay(10%)", getValue: (e, c) => c["10%"].gstToPay },
  { label: "GST to Pay(20%)", getValue: (e, c) => c["20%"].gstToPay },
  { label: "GST to Pay(25%)", getValue: (e, c) => c["25%"].gstToPay },
  { label: "GST to Pay(30%)", getValue: (e, c) => c["30%"].gstToPay },
];

export default function HistoryView() {
  const [entries, setEntries] = useState<BasicDetails[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<BasicDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const quotes = await fetchInternationalQuote();
        setEntries(quotes);
      } catch (err) {
        console.error(err);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="p-8 overflow-auto h-full bg-white dark:bg-[#23272f] min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">
        History
      </h1>
      <div
        className="overflow-x-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : (
          <table className="min-w-max text-xs border border-gray-300 dark:border-gray-700">
            <thead>
              <tr>
                {HEADERS.map((header) => (
                  <th
                    key={header.label}
                    className="px-2 py-1 border-b border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-700 text-left"
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const calculatedValues = computeDerivedValues(entry);
                return (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    {HEADERS.map((header) => (
                      <td
                        key={header.label}
                        className="px-2 py-1 border-b border-gray-200 dark:border-gray-700 text-left"
                      >
                        {header.getValue(entry, calculatedValues)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {selectedEntry && (
        <PdfPreviewModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
