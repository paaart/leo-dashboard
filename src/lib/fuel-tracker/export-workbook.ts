import * as XLSX from "xlsx";
import type { FuelAnalyticsFilters } from "./types";
import type { VehicleTrackerExportData } from "./export-data";

function dateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateTime(value: string): Date {
  return new Date(value);
}

function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
}

function setNumberFormat(
  sheet: XLSX.WorkSheet,
  column: number,
  startRow: number,
  endRow: number,
  format: string
) {
  for (let row = startRow; row <= endRow; row += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
    if (cell) cell.z = format;
  }
}

function addAutoFilter(
  sheet: XLSX.WorkSheet,
  columnCount: number,
  rowCount: number
) {
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rowCount, c: columnCount - 1 },
    }),
  };
}

function safeFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function createVehicleTrackerWorkbook(
  data: VehicleTrackerExportData,
  filters: FuelAnalyticsFilters
) {
  const workbook = XLSX.utils.book_new();
  const validFuelEntries = data.fuelEntries.filter(
    (entry) =>
      entry.kmDriven !== null && entry.kmDriven > 0 && !entry.warningFlag
  );
  const fuelAmount = data.fuelEntries.reduce(
    (sum, entry) => sum + entry.fuelAmount,
    0
  );
  const fuelLiters = data.fuelEntries.reduce(
    (sum, entry) => sum + entry.fuelLiters,
    0
  );
  const validKm = validFuelEntries.reduce(
    (sum, entry) => sum + (entry.kmDriven ?? 0),
    0
  );
  const validLiters = validFuelEntries.reduce(
    (sum, entry) => sum + entry.fuelLiters,
    0
  );
  const otherExpenses = data.expenseEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0
  );

  const summaryRows: (string | number | Date | null)[][] = [
    ["Vehicle Tracker Export"],
    ["Generated at", new Date()],
    [
      "Vehicle scope",
      data.selectedVehicle
        ? `${data.selectedVehicle.vehicleNo} - ${data.selectedVehicle.vehicleType}`
        : "All vehicles",
    ],
    ["Period from", dateOnly(filters.dateFrom)],
    ["Period to", dateOnly(filters.dateTo)],
    [],
    ["Metric", "Value"],
    ["Fuel entries", data.fuelEntries.length],
    ["Fuel amount (INR)", fuelAmount],
    ["Fuel litres", fuelLiters],
    ["Valid KM driven", validKm],
    ["Average mileage (KM/L)", validLiters > 0 ? validKm / validLiters : null],
    ["Warning entries", data.fuelEntries.filter((entry) => entry.warningFlag).length],
    ["Other expense entries", data.expenseEntries.length],
    ["Other expenses (INR)", otherExpenses],
    ["Total operating cost (INR)", fuelAmount + otherExpenses],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows, { cellDates: true });
  setColumnWidths(summarySheet, [30, 34]);
  setNumberFormat(summarySheet, 1, 1, 1, "dd-mmm-yyyy hh:mm");
  setNumberFormat(summarySheet, 1, 3, 4, "dd-mmm-yyyy");
  setNumberFormat(summarySheet, 1, 8, 8, "₹#,##0.00");
  setNumberFormat(summarySheet, 1, 9, 11, "#,##0.00");
  setNumberFormat(summarySheet, 1, 14, 15, "₹#,##0.00");
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const fuelHeaders = [
    "S.No",
    "Month",
    "Date",
    "Vehicle No",
    "Vehicle Type",
    "Company",
    "Driver",
    "Driver Mobile",
    "Fuel Amount (INR)",
    "Fuel Litres",
    "Fuel Rate (INR/L)",
    "Odometer",
    "Previous Odometer",
    "KM Driven",
    "Mileage (KM/L)",
    "Cost/KM (INR)",
    "Warning",
    "Warning Reason",
    "Remarks",
    "Bill Proof",
    "Meter Proof",
    "Created At",
    "Entry ID",
  ];
  const fuelRows = data.fuelEntries.map((entry, index) => [
    index + 1,
    entry.fuelDate.slice(0, 7),
    dateOnly(entry.fuelDate),
    entry.vehicleNo,
    entry.vehicleType,
    entry.company,
    entry.driverName,
    entry.driverMobile,
    entry.fuelAmount,
    entry.fuelLiters,
    entry.fuelRate,
    entry.odometerReading,
    entry.previousOdometerReading,
    entry.kmDriven,
    entry.approxMileage,
    entry.costPerKm,
    entry.warningFlag ? "Yes" : "No",
    entry.warningReason,
    entry.remarks,
    entry.hasBillProof ? "Available" : "Not available",
    entry.hasMeterProof ? "Available" : "Not available",
    dateTime(entry.createdAt),
    entry.id,
  ]);
  const fuelSheet = XLSX.utils.aoa_to_sheet([fuelHeaders, ...fuelRows], {
    cellDates: true,
  });
  setColumnWidths(fuelSheet, [7, 10, 13, 16, 18, 22, 20, 16, 18, 14, 18, 14, 18, 14, 17, 16, 10, 28, 28, 14, 14, 21, 38]);
  addAutoFilter(fuelSheet, fuelHeaders.length, fuelRows.length);
  setNumberFormat(fuelSheet, 2, 1, fuelRows.length, "dd-mmm-yyyy");
  setNumberFormat(fuelSheet, 8, 1, fuelRows.length, "₹#,##0.00");
  setNumberFormat(fuelSheet, 9, 1, fuelRows.length, "#,##0.000");
  setNumberFormat(fuelSheet, 10, 1, fuelRows.length, "₹#,##0.00");
  setNumberFormat(fuelSheet, 11, 1, fuelRows.length, "#,##0");
  setNumberFormat(fuelSheet, 12, 1, fuelRows.length, "#,##0");
  setNumberFormat(fuelSheet, 13, 1, fuelRows.length, "#,##0");
  setNumberFormat(fuelSheet, 14, 1, fuelRows.length, "#,##0.00");
  setNumberFormat(fuelSheet, 15, 1, fuelRows.length, "₹#,##0.00");
  setNumberFormat(fuelSheet, 21, 1, fuelRows.length, "dd-mmm-yyyy hh:mm");
  XLSX.utils.book_append_sheet(workbook, fuelSheet, "Fuel Entries");

  const expenseHeaders = [
    "S.No",
    "Month",
    "Invoice Date",
    "Vehicle(s)",
    "Vehicle Type(s)",
    "Company",
    "Expense Type",
    "Description",
    "Amount (INR)",
    "Vendor",
    "Invoice Number",
    "Due Date",
    "Invoice Status",
    "Invoice Total (INR)",
    "Invoice Paid (INR)",
    "Invoice Balance (INR)",
    "Invoice Remarks",
    "Created At",
    "Item ID",
    "Invoice ID",
  ];
  const expenseRows = data.expenseEntries.map((entry, index) => [
    index + 1,
    entry.invoiceDate.slice(0, 7),
    dateOnly(entry.invoiceDate),
    entry.vehicles.length > 0
      ? entry.vehicles.map((vehicle) => vehicle.vehicleNo).join(", ")
      : "General / All Vehicles",
    entry.vehicles.map((vehicle) => vehicle.vehicleType).join(", "),
    Array.from(
      new Set(
        entry.vehicles
          .map((vehicle) => vehicle.company)
          .filter((company): company is string => Boolean(company))
      )
    ).join(", "),
    entry.expenseType,
    entry.description,
    entry.amount,
    entry.vendorName,
    entry.invoiceNumber,
    dateOnly(entry.dueDate),
    entry.invoiceStatus.replaceAll("_", " "),
    entry.invoiceTotal,
    entry.invoicePaid,
    entry.invoiceBalance,
    entry.invoiceRemarks,
    dateTime(entry.createdAt),
    entry.itemId,
    entry.invoiceId,
  ]);
  const expenseSheet = XLSX.utils.aoa_to_sheet(
    [expenseHeaders, ...expenseRows],
    { cellDates: true }
  );
  setColumnWidths(expenseSheet, [7, 10, 14, 24, 22, 22, 18, 30, 16, 22, 18, 14, 18, 19, 18, 20, 28, 21, 38, 38]);
  addAutoFilter(expenseSheet, expenseHeaders.length, expenseRows.length);
  setNumberFormat(expenseSheet, 2, 1, expenseRows.length, "dd-mmm-yyyy");
  setNumberFormat(expenseSheet, 8, 1, expenseRows.length, "₹#,##0.00");
  setNumberFormat(expenseSheet, 11, 1, expenseRows.length, "dd-mmm-yyyy");
  setNumberFormat(expenseSheet, 13, 1, expenseRows.length, "₹#,##0.00");
  setNumberFormat(expenseSheet, 14, 1, expenseRows.length, "₹#,##0.00");
  setNumberFormat(expenseSheet, 15, 1, expenseRows.length, "₹#,##0.00");
  setNumberFormat(expenseSheet, 17, 1, expenseRows.length, "dd-mmm-yyyy hh:mm");
  XLSX.utils.book_append_sheet(workbook, expenseSheet, "Other Expenses");

  workbook.Props = {
    Title: "Vehicle Tracker Export",
    Subject: "Filtered vehicle fuel and expense entries",
    Author: "Leo Dashboard",
    CreatedDate: new Date(),
  };

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    cellDates: true,
    compression: true,
  }) as Buffer;
  const scope = safeFilenamePart(
    data.selectedVehicle?.vehicleNo ?? "all-vehicles"
  );
  const period = `${filters.dateFrom ?? "start"}_to_${
    filters.dateTo ?? "latest"
  }`;

  return {
    buffer,
    filename: `vehicle-tracker_${scope}_${period}.xlsx`,
  };
}
