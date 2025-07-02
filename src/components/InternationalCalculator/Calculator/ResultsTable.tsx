// components/InternationalCalculator/ResultsTable.tsx
import React from "react";

const margins = ["10%", "20%", "25%", "30%"];

const sectionMap: Record<string, string[]> = {
  A: ["packing", "handling"],
  B: ["origin", "gstOrigin", "marginOrigin"],
  C: ["freight", "gstFreight", "marginFreight"],
  D: ["dthc", "destination", "totalDest", "gstDest", "marginDest"],
  E: ["netTotal", "leoGSTALL", "leoGSTFreight", "totalGST", "total"],
  F: ["inputCredit", "combinedMargin", "gstToPay"],
};

const sectionLabels: Record<string, string> = {
  A: "Part A",
  B: "Part B",
  C: "Part C",
  D: "Part D",
  E: "Part E",
  F: "Part F",
};

const rowLabels: Record<string, string> = {
  packing: "Packing",
  handling: "Handling & transportation till port",
  origin: "Origin Charges Custom",
  gstOrigin: "Origin charges GST (vendor)",
  marginOrigin: "Origin charges Margin",
  freight: "Ocean freight",
  gstFreight: "Ocean freight GST (Vendor)",
  marginFreight: "Ocean freight Margin",
  dthc: "DTHC",
  destination: "Destination charges",
  totalDest: "Total Destination charges",
  gstDest: "Total Destination charges GST (vendor) - If applicable",
  marginDest: "Total Destination charges margin",
  netTotal: "Net Total",
  leoGSTALL: "Leo GST (All services except freight) - 18%",
  leoGSTFreight: "LEO GST for Freight - 5%",
  totalGST: "Total GST",
  total: "Total (Net Total + Total GST)",
  inputCredit: "Input credit (For reference)",
  combinedMargin: "Margin (For reference)",
  gstToPay: "GST to Pay",
};

type Props = {
  calculatedValues: Record<string, Record<string, string>>;
};

export default function ResultsTable({ calculatedValues }: Props) {
  return (
    <section className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Cost Breakdown
      </h2>
      <table className="w-full border border-gray-300 dark:border-gray-600">
        <thead>
          <tr>
            <th className="border px-4 py-2 text-left">Item</th>
            {margins.map((m) => (
              <th key={m} className="border px-4 py-2 text-center">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(sectionMap).map(([sectionKey, rows]) => (
            <React.Fragment key={sectionKey}>
              <tr className="bg-blue-100 dark:bg-blue-900">
                <td
                  colSpan={margins.length + 1}
                  className="font-bold px-4 py-2 text-gray-800 dark:text-white"
                >
                  {sectionLabels[sectionKey]}
                </td>
              </tr>
              {rows.map((key) => (
                <tr key={key}>
                  <td className="border px-4 py-2 text-gray-700 dark:text-gray-300">
                    {rowLabels[key]}
                  </td>
                  {margins.map((m) => (
                    <td
                      key={m}
                      className="border px-4 py-2 text-center text-gray-700 dark:text-gray-300"
                    >
                      {calculatedValues[m][key]}
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </section>
  );
}
