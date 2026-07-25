"use client";

import React, { useState, useEffect } from "react";
import { BasicDetails } from "../types";
import PdfPreviewModal from "./PdfPreviewModal";
import { fetchInternationalQuote } from "@/lib/api";
import { computeDerivedValues } from "../helpers";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";
import { tableHead, tableWrapper } from "@/components/shared/ui";

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
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Operations"
          title="International Quote History"
          subtitle="Review saved international quotes and open a PDF preview from any row."
        />

        {isLoading ? (
          <LoadingState label="Loading saved quotes" />
        ) : entries.length === 0 ? (
          <EmptyState
            title="No saved quotes"
            description="Saved international quotes will appear here."
          />
        ) : (
          <SectionCard
            title="Saved Quotes"
            description="Select a row to preview the generated quote document."
          >
            <div
              className={tableWrapper}
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <table className="min-w-max text-xs">
                <thead className={tableHead}>
                  <tr>
                    {HEADERS.map((header) => (
                      <th
                        key={header.label}
                        className="px-3 py-2 text-left font-medium"
                      >
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {entries.map((entry, idx) => {
                    const calculatedValues = computeDerivedValues(entry);
                    return (
                      <tr
                        key={idx}
                        className="cursor-pointer bg-surface transition-colors hover:bg-accent-soft"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        {HEADERS.map((header) => (
                          <td
                            key={header.label}
                            className="px-3 py-2 text-left text-fg-muted"
                          >
                            {header.getValue(entry, calculatedValues)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
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
