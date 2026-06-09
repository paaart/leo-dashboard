// components/InternationalCalculator/CalculatorWrapper.tsx
"use client";

import React, { useState } from "react";
import { BasicDetails } from "./types";
import ClientInfoSection from "./Calculator/ClientInfoSection";
import ChargesSection from "./Calculator/ChargesSection";
import ResultsTable from "./Calculator/ResultsTable";
import {
  computeDerivedValues,
  isDataComplete,
  margins,
  generateTableData,
  generatePartFData,
  generateTotalRow,
} from "./helpers";
import { saveInternationalQuote } from "@/lib/api";
import SubmitActions from "./Calculator/SubmitActions";
import toast from "react-hot-toast";
import { downloadPDF } from "./Calculator/DownloadDocument";
import { EmptyState, PageHeader } from "@/components/shared/DashboardUI";

const initialDetails: BasicDetails = {
  customerName: "",
  originCity: "",
  originPort: "",
  destinationCity: "",
  destinationCountry: "",
  destinationPort: "",
  mode: "",
  packingCharges: "",
  handlingCharges: "",
  originChargesCustom: "",
  oceanFreight: "",
  dthc: "",
  destination: "",
  volumeInCBM: "",
  calculateGSTVal: true,
};

export default function InternationalShipping() {
  const [basicDetails, setBasicDetails] =
    useState<BasicDetails>(initialDetails);
  const [calculatedValues, setCalculatedValues] = useState<
    Record<string, Record<string, string>>
  >({});

  const handleInputChange = (
    key: keyof BasicDetails,
    value: string | boolean
  ) => {
    setBasicDetails((prev) => {
      const updated = { ...prev, [key]: value };
      const computed = computeDerivedValues(updated);
      setCalculatedValues(computed);
      return updated;
    });
  };

  const handleSubmit = async () => {
    const result = await saveInternationalQuote(basicDetails);
    if (result.success) {
      toast.success("Quote saved!");
    } else {
      toast.error("Failed to save quote.");
    }
  };

  const handlePDFDownload = () => {
    const dateStr = new Date().toLocaleDateString("en-IN");
    const tableData = generateTableData(calculatedValues);
    const partFData = generatePartFData(calculatedValues);
    const totals = generateTotalRow(calculatedValues);

    downloadPDF({
      basicDetails,
      margins,
      tableData,
      partFData,
      totals,
      dateStr,
    });
  };

  const hasCalculatedValues = Object.keys(calculatedValues).length > 0;

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Operations"
          title="International Calculator"
          subtitle="Prepare international shipment quotes with origin, freight, destination, GST, and margin views."
        />

        <ClientInfoSection data={basicDetails} onChange={handleInputChange} />
        <ChargesSection data={basicDetails} onChange={handleInputChange} />

        {hasCalculatedValues ? (
          <ResultsTable calculatedValues={calculatedValues} />
        ) : (
          <EmptyState
            title="No quote calculated yet"
            description="Enter shipment and cost details to preview margin, GST, and quote totals."
          />
        )}

        <SubmitActions
          onSubmit={handleSubmit}
          onPrint={handlePDFDownload}
          isDisabled={!isDataComplete(basicDetails)}
        />
      </div>
    </div>
  );
}
