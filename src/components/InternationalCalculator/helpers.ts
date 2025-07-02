// components/InternationalCalculator/helpers.ts
import { BasicDetails } from "./types";

export const margins = ["10%", "20%", "25%", "30%"];

export const calculateGST = (charges: number, rate: number) =>
  (charges * rate) / 100;

export const calculateMargin = (
  charges: number,
  gst: number,
  marginRate: number
) => {
  const total = charges + gst;
  return ((total * marginRate) / 100).toFixed(2);
};

export const computeDerivedValues = (
  updated: BasicDetails
): Record<string, Record<string, string>> => {
  const shouldCalcGST = updated.calculateGSTVal;

  const packing = parseFloat(updated.packingCharges || "0");
  const handling = parseFloat(updated.handlingCharges || "0");
  const origin = parseFloat(updated.originChargesCustom || "0");
  const freight = parseFloat(updated.oceanFreight || "0");
  const dthc = parseFloat(updated.dthc || "0");
  const destination = parseFloat(updated.destination || "0");

  const result: Record<string, Record<string, string>> = {};

  margins.forEach((margin) => {
    const marginRate = parseFloat(margin);

    const gstOrigin = shouldCalcGST ? calculateGST(origin, 18) : 0;
    const marginOrigin = parseFloat(
      calculateMargin(origin, gstOrigin, marginRate)
    );

    const gstFreight = shouldCalcGST ? calculateGST(freight, 5) : 0;
    const marginFreight = parseFloat(
      calculateMargin(freight, gstFreight, marginRate)
    );

    const totalDest = dthc + destination;
    const gstDest = shouldCalcGST ? calculateGST(totalDest, 18) : 0;
    const marginDest = parseFloat(
      calculateMargin(totalDest, gstDest, marginRate)
    );

    const netTotal =
      packing +
      handling +
      origin +
      gstOrigin +
      marginOrigin +
      freight +
      gstFreight +
      marginFreight +
      totalDest +
      gstDest +
      marginDest;

    const leoGSTALL = calculateGST(
      packing +
        handling +
        origin +
        gstOrigin +
        marginOrigin +
        totalDest +
        gstDest +
        marginDest,
      18
    );

    const leoGSTFreight = calculateGST(marginFreight + freight + gstFreight, 5);

    const totalGST = leoGSTALL + leoGSTFreight;

    const inputCredit = gstOrigin + gstFreight + gstDest;
    const combinedMargin = marginOrigin + marginFreight + marginDest;
    const gstToPay = totalGST - inputCredit;

    result[margin] = {
      packing: packing.toFixed(2),
      handling: handling.toFixed(2),

      origin: origin.toFixed(2),
      gstOrigin: gstOrigin.toFixed(2),
      marginOrigin: marginOrigin.toFixed(2),

      freight: freight.toFixed(2),
      gstFreight: gstFreight.toFixed(2),
      marginFreight: marginFreight.toFixed(2),

      dthc: dthc.toFixed(2),
      destination: destination.toFixed(2),
      totalDest: totalDest.toFixed(2),
      gstDest: gstDest.toFixed(2),
      marginDest: marginDest.toFixed(2),

      netTotal: netTotal.toFixed(2),
      leoGSTALL: leoGSTALL.toFixed(2),
      leoGSTFreight: leoGSTFreight.toFixed(2),
      totalGST: totalGST.toFixed(2),
      total: (netTotal + totalGST).toFixed(2),

      inputCredit: inputCredit.toFixed(2),
      combinedMargin: combinedMargin.toFixed(2),
      gstToPay: gstToPay.toFixed(2),
    };
  });

  return result;
};

export function isDataComplete(details: BasicDetails): boolean {
  const requiredFields: (keyof BasicDetails)[] = [
    "customerName",
    "originCity",
    "originPort",
    "destinationCity",
    "destinationCountry",
    "destinationPort",
    "mode",
    "packingCharges",
    "handlingCharges",
    "originChargesCustom",
    "oceanFreight",
    "dthc",
    "destination",
  ];

  return requiredFields.every((key) => {
    const value = details[key];
    return typeof value === "string" ? value.trim().length > 0 : true;
  });
}

export const generateTableData = (
  calculatedValues: Record<string, Record<string, string>>
): Record<string, { name: string; values: Record<string, string> }[]> => {
  const parts: Record<
    string,
    { name: string; key: keyof (typeof calculatedValues)[string] }[]
  > = {
    A: [
      { name: "Packing Charges", key: "packing" },
      { name: "Handling Charges", key: "handling" },
    ],
    B: [
      { name: "Origin Charges", key: "origin" },
      { name: "GST on Origin Charges", key: "gstOrigin" },
      { name: "Margin on Origin Charges", key: "marginOrigin" },
    ],
    C: [
      { name: "Ocean Freight", key: "freight" },
      { name: "GST on Freight", key: "gstFreight" },
      { name: "Margin on Freight", key: "marginFreight" },
    ],
    D: [
      { name: "DTHC", key: "dthc" },
      { name: "Destination Charges", key: "destination" },
      { name: "Total Dest Charges", key: "totalDest" },
      { name: "GST on Dest Charges", key: "gstDest" },
      { name: "Margin on Dest Charges", key: "marginDest" },
    ],
    E: [
      { name: "Net Total", key: "netTotal" },
      { name: "GST on All (18%)", key: "leoGSTALL" },
      { name: "GST on Freight (5%)", key: "leoGSTFreight" },
      { name: "Total GST", key: "totalGST" },
      { name: "Total Amount", key: "total" },
    ],
  };

  const result: Record<
    string,
    { name: string; values: Record<string, string> }[]
  > = {};

  Object.entries(parts).forEach(([partKey, fields]) => {
    result[partKey] = fields.map(({ name, key }) => ({
      name,
      values: Object.fromEntries(
        Object.entries(calculatedValues).map(([margin, values]) => [
          margin,
          values[key],
        ])
      ),
    }));
  });

  return result;
};

export const generatePartFData = (
  calculatedValues: Record<string, Record<string, string>>
): { name: string; values: Record<string, string> }[] => {
  const fields = [
    { name: "Input Credit", key: "inputCredit" },
    { name: "Combined Margin", key: "combinedMargin" },
    { name: "GST to be Paid", key: "gstToPay" },
  ];

  return fields.map(({ name, key }) => ({
    name,
    values: Object.fromEntries(
      Object.entries(calculatedValues).map(([margin, values]) => [
        margin,
        values[key],
      ])
    ),
  }));
};

export const generateTotalRow = (
  calculatedValues: Record<string, Record<string, string>>
): string[] => {
  return Object.values(calculatedValues).map((values) => values.total);
};
