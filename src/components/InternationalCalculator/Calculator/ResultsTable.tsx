// components/InternationalCalculator/ResultsTable.tsx
import React from "react";
import { Calculator, IndianRupee, Percent } from "lucide-react";
import { MetricCard, SectionCard } from "@/components/shared/DashboardUI";

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
  const primaryMargin = "10%";
  const primaryValues = calculatedValues[primaryMargin];

  return (
    <SectionCard
      title="Margin, GST & Summary"
      description="Review the calculated quote across configured margin bands."
    >
      {primaryValues ? (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Total at 10%"
            value={`₹${primaryValues.total}`}
            hint="Net total plus GST"
            icon={<IndianRupee className="h-5 w-5" />}
          />
          <MetricCard
            label="GST to Pay"
            value={`₹${primaryValues.gstToPay}`}
            hint="For reference"
            icon={<Calculator className="h-5 w-5" />}
          />
          <MetricCard
            label="Combined Margin"
            value={`₹${primaryValues.combinedMargin}`}
            hint="At 10% margin"
            icon={<Percent className="h-5 w-5" />}
          />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            <tr>
              <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold dark:border-gray-800">
                Item
              </th>
              {margins.map((m) => (
                <th
                  key={m}
                  className="border-b border-gray-200 px-4 py-3 text-right font-semibold dark:border-gray-800"
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {Object.entries(sectionMap).map(([sectionKey, rows]) => (
              <React.Fragment key={sectionKey}>
                <tr className="bg-blue-50 dark:bg-blue-950/40">
                  <td
                    colSpan={margins.length + 1}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300"
                  >
                    {sectionLabels[sectionKey]}
                  </td>
                </tr>
                {rows.map((key) => (
                  <tr
                    key={key}
                    className="bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                  >
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {rowLabels[key]}
                    </td>
                    {margins.map((m) => (
                      <td
                        key={m}
                        className="px-4 py-3 text-right font-medium tabular-nums text-gray-950 dark:text-gray-50"
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
      </div>
    </SectionCard>
  );
}
