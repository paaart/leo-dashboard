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

  return (
    <div className="p-8 bg-white dark:bg-[#23272f] min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">
        🌍 International Shipping Calculator
      </h1>

      <ClientInfoSection data={basicDetails} onChange={handleInputChange} />
      <ChargesSection data={basicDetails} onChange={handleInputChange} />

      {Object.keys(calculatedValues).length > 0 && (
        <ResultsTable calculatedValues={calculatedValues} />
      )}
      <SubmitActions
        onSubmit={handleSubmit}
        onPrint={handlePDFDownload}
        isDisabled={!isDataComplete(basicDetails)}
      />
    </div>
  );
}
