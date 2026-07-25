// components/InternationalCalculator/ResultsTable.tsx
import React from "react";
import { Calculator, IndianRupee, Percent } from "lucide-react";
import { MetricCard, SectionCard } from "@/components/shared/DashboardUI";
import {
  tableHead,
  tableHeadCell,
  tableWrapper,
} from "@/components/shared/ui";

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

      <div className={tableWrapper}>
        <table className="min-w-[760px] w-full text-sm">
          <thead className={tableHead}>
            <tr>
              <th className={`${tableHeadCell} text-left`}>
                Item
              </th>
              {margins.map((m) => (
                <th
                  key={m}
                  className={`${tableHeadCell} text-right`}
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {Object.entries(sectionMap).map(([sectionKey, rows]) => (
              <React.Fragment key={sectionKey}>
                <tr className="bg-accent-soft">
                  <td
                    colSpan={margins.length + 1}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent-soft-fg"
                  >
                    {sectionLabels[sectionKey]}
                  </td>
                </tr>
                {rows.map((key) => (
                  <tr
                    key={key}
                    className="bg-surface transition-colors hover:bg-surface-2/60"
                  >
                    <td className="px-4 py-3 text-fg-muted">
                      {rowLabels[key]}
                    </td>
                    {margins.map((m) => (
                      <td
                        key={m}
                        className="px-4 py-3 text-right font-medium tabular-nums text-fg"
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
