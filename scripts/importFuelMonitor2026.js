import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import xlsx from "xlsx";

const WORKBOOK_PATH = "/Users/paaart/Downloads/Fuel_Monitor_2026-27.xlsx";
const SHEET_NAMES = ["Apr26", "May26", "Jun26"];
const DATA_START_ROW = 8;
const REMARKS = "Imported from Fuel Monitor 2026-27";

const isDryRun = process.argv.includes("--dry-run");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: false });

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  if (!service) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function normalizeVehicleNo(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatDateParts(parts) {
  const year = String(parts.y).padStart(4, "0");
  const month = String(parts.m).padStart(2, "0");
  const day = String(parts.d).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateCell(cell) {
  if (!cell) return null;

  if (typeof cell.v === "number") {
    const parts = xlsx.SSF.parse_date_code(cell.v);
    return parts ? formatDateParts(parts) : null;
  }

  if (cell.v instanceof Date) {
    const year = cell.v.getFullYear();
    const month = String(cell.v.getMonth() + 1).padStart(2, "0");
    const day = String(cell.v.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const display = String(cell.w ?? cell.v ?? "").trim();
  const match = display.match(/^(\d{1,2})([A-Za-z]{3})(\d{2,4})$/);
  if (match) {
    const monthIndex = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    }[match[2].toLowerCase()];
    const year =
      match[3].length === 2 ? Number(`20${match[3]}`) : Number(match[3]);
    if (monthIndex && Number.isFinite(year)) {
      return formatDateParts({ y: year, m: monthIndex, d: Number(match[1]) });
    }
  }

  const parsed = new Date(display);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateFuelEntryValues({
  currentOdometer,
  previousOdometer,
  fuelAmount,
  fuelLiters,
  allowBaselineEqual = false,
}) {
  const kmDriven = currentOdometer - previousOdometer;
  const warningFlag = allowBaselineEqual ? kmDriven < 0 : kmDriven <= 0;
  const hasDistance = kmDriven > 0;

  return {
    previous_odometer_reading: previousOdometer,
    km_driven: kmDriven,
    approx_mileage: hasDistance && !warningFlag ? kmDriven / fuelLiters : null,
    fuel_rate: fuelAmount / fuelLiters,
    cost_per_km: hasDistance && !warningFlag ? fuelAmount / kmDriven : null,
    warning_flag: warningFlag,
    warning_reason: warningFlag
      ? "Current odometer reading is not greater than previous odometer reading"
      : null,
  };
}

function duplicateKey(entry) {
  return [
    entry.vehicle_id,
    entry.fuel_date,
    round(entry.fuel_amount, 2).toFixed(2),
    round(entry.fuel_liters, 3).toFixed(3),
    round(entry.odometer_reading, 2).toFixed(2),
  ].join("|");
}

function rowHasAnyData(cells) {
  return cells.some((cell) => {
    const value = cell?.v ?? cell?.w;
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}

function readWorkbookRows() {
  if (!fs.existsSync(WORKBOOK_PATH)) {
    throw new Error(`Workbook not found: ${WORKBOOK_PATH}`);
  }

  const workbook = xlsx.readFile(WORKBOOK_PATH, { cellDates: false });
  const rows = [];
  const invalidRows = [];

  for (const sheetName of SHEET_NAMES) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Missing sheet: ${sheetName}`);

    const range = xlsx.utils.decode_range(sheet["!ref"] ?? "A1:E1");
    for (let rowIndex = DATA_START_ROW - 1; rowIndex <= range.e.r; rowIndex += 1) {
      const cells = [0, 1, 2, 3, 4].map((columnIndex) => {
        const address = xlsx.utils.encode_cell({ r: rowIndex, c: columnIndex });
        return sheet[address] ?? null;
      });

      if (!rowHasAnyData(cells)) continue;

      const rowNumber = rowIndex + 1;
      const fuelDate = parseDateCell(cells[0]);
      const vehicleNo = normalizeVehicleNo(cells[1]?.v ?? cells[1]?.w);
      const fuelAmount = parseNumber(cells[2]?.v ?? cells[2]?.w);
      const fuelLiters = parseNumber(cells[3]?.v ?? cells[3]?.w);
      const odometerReading = parseNumber(cells[4]?.v ?? cells[4]?.w);

      if (
        !fuelDate ||
        !vehicleNo ||
        fuelAmount === null ||
        fuelLiters === null ||
        odometerReading === null ||
        fuelAmount <= 0 ||
        fuelLiters <= 0 ||
        odometerReading <= 0
      ) {
        invalidRows.push({ sheetName, rowNumber, vehicleNo });
        continue;
      }

      rows.push({
        sheetName,
        rowNumber,
        fuel_date: fuelDate,
        vehicle_no: vehicleNo,
        fuel_amount: round(fuelAmount, 2),
        fuel_liters: round(fuelLiters, 3),
        odometer_reading: round(odometerReading, 2),
      });
    }
  }

  return { rows, invalidRows };
}

async function fetchAllVehicles(supabase) {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, vehicle_no, company, starting_odometer")
    .order("vehicle_no", { ascending: true });

  if (error) throw error;

  return new Map(
    (data ?? []).map((vehicle) => [
      normalizeVehicleNo(vehicle.vehicle_no),
      {
        id: vehicle.id,
        vehicle_no: normalizeVehicleNo(vehicle.vehicle_no),
        company: vehicle.company?.trim() || null,
        starting_odometer: Number(vehicle.starting_odometer),
      },
    ])
  );
}

async function fetchExistingEntries(supabase, vehicleIds) {
  const entries = [];
  const chunkSize = 100;

  for (let index = 0; index < vehicleIds.length; index += chunkSize) {
    const chunk = vehicleIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("fuel_entries")
      .select(
        "id, vehicle_id, fuel_date, fuel_amount, fuel_liters, odometer_reading, created_at"
      )
      .in("vehicle_id", chunk)
      .order("fuel_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    entries.push(...(data ?? []));
  }

  return entries;
}

function buildImportPlan({ rows, vehiclesByNumber, existingEntries }) {
  const missingVehicleNumbers = new Set();
  const vehicleState = new Map();
  const duplicateKeys = new Set();
  const duplicateRows = [];
  const validRows = [];
  const rowsByVehicle = new Map();

  for (const existingEntry of existingEntries) {
    duplicateKeys.add(duplicateKey(existingEntry));
    const state = vehicleState.get(existingEntry.vehicle_id) ?? [];
    state.push({
      kind: "existing",
      fuel_date: existingEntry.fuel_date,
      odometer_reading: Number(existingEntry.odometer_reading),
      created_at: existingEntry.created_at,
    });
    vehicleState.set(existingEntry.vehicle_id, state);
  }

  for (const row of rows) {
    const vehicle = vehiclesByNumber.get(row.vehicle_no);
    if (!vehicle) {
      missingVehicleNumbers.add(row.vehicle_no);
      continue;
    }

    const entry = { ...row, vehicle_id: vehicle.id };
    validRows.push(entry);

    if (duplicateKeys.has(duplicateKey(entry))) {
      duplicateRows.push(entry);
      const state = vehicleState.get(vehicle.id) ?? [];
      if (!state.some((item) => item.kind === "duplicate" && duplicateKey(item) === duplicateKey(entry))) {
        state.push({
          kind: "duplicate",
          fuel_date: entry.fuel_date,
          odometer_reading: entry.odometer_reading,
          fuel_amount: entry.fuel_amount,
          fuel_liters: entry.fuel_liters,
          vehicle_id: entry.vehicle_id,
        });
        vehicleState.set(vehicle.id, state);
      }
      continue;
    }

    const vehicleRows = rowsByVehicle.get(vehicle.id) ?? [];
    vehicleRows.push({ ...entry, vehicle });
    rowsByVehicle.set(vehicle.id, vehicleRows);
  }

  const rowsToInsert = [];

  for (const [vehicleId, vehicleRows] of rowsByVehicle) {
    const timeline = vehicleState.get(vehicleId) ?? [];
    const sortedRows = vehicleRows.sort((a, b) => {
      const dateCompare = a.fuel_date.localeCompare(b.fuel_date);
      if (dateCompare !== 0) return dateCompare;
      return a.rowNumber - b.rowNumber;
    });

    for (const row of sortedRows) {
      const priorEntries = timeline
        .filter((entry) => {
          if (entry.fuel_date < row.fuel_date) return true;
          if (entry.fuel_date > row.fuel_date) return false;
          return entry.kind !== "pending" || entry.rowNumber < row.rowNumber;
        })
        .sort((a, b) => {
          const dateCompare = a.fuel_date.localeCompare(b.fuel_date);
          if (dateCompare !== 0) return dateCompare;
          const aOrder = a.rowNumber ?? 0;
          const bOrder = b.rowNumber ?? 0;
          return aOrder - bOrder;
        });

      const previousEntry = priorEntries.at(-1);
      const previousOdometer = previousEntry
        ? Number(previousEntry.odometer_reading)
        : Number(row.vehicle.starting_odometer);
      const calculations = calculateFuelEntryValues({
        currentOdometer: row.odometer_reading,
        previousOdometer,
        fuelAmount: row.fuel_amount,
        fuelLiters: row.fuel_liters,
        allowBaselineEqual: !previousEntry,
      });

      const insertRow = {
        vehicle_id: row.vehicle_id,
        company: row.vehicle.company,
        driver_name: null,
        driver_mobile: null,
        fuel_date: row.fuel_date,
        fuel_amount: row.fuel_amount,
        fuel_liters: row.fuel_liters,
        odometer_reading: row.odometer_reading,
        previous_odometer_reading: calculations.previous_odometer_reading,
        km_driven: calculations.km_driven,
        approx_mileage: calculations.approx_mileage,
        fuel_rate: calculations.fuel_rate,
        cost_per_km: calculations.cost_per_km,
        bill_image_path: null,
        meter_image_path: null,
        remarks: REMARKS,
        warning_flag: calculations.warning_flag,
        warning_reason: calculations.warning_reason,
        source: `${row.sheetName}!${row.rowNumber}`,
        vehicle_no: row.vehicle_no,
      };

      rowsToInsert.push(insertRow);
      timeline.push({
        kind: "pending",
        fuel_date: row.fuel_date,
        odometer_reading: row.odometer_reading,
        rowNumber: row.rowNumber,
      });
      duplicateKeys.add(duplicateKey(row));
    }
  }

  rowsToInsert.sort((a, b) => {
    const vehicleCompare = a.vehicle_no.localeCompare(b.vehicle_no);
    if (vehicleCompare !== 0) return vehicleCompare;
    const dateCompare = a.fuel_date.localeCompare(b.fuel_date);
    if (dateCompare !== 0) return dateCompare;
    return a.source.localeCompare(b.source);
  });

  return {
    validRows,
    duplicateRows,
    rowsToInsert,
    missingVehicleNumbers: [...missingVehicleNumbers].sort(),
  };
}

async function insertRows(supabase, rowsToInsert) {
  const payload = rowsToInsert.map(({ source, vehicle_no, ...row }) => row);
  const chunkSize = 100;
  let insertedCount = 0;

  for (let index = 0; index < payload.length; index += chunkSize) {
    const chunk = payload.slice(index, index + chunkSize);
    const { error } = await supabase.from("fuel_entries").insert(chunk);
    if (error) throw error;
    insertedCount += chunk.length;
  }

  return insertedCount;
}

async function main() {
  const { rows, invalidRows } = readWorkbookRows();
  const supabase = createAdminClient();
  const vehiclesByNumber = await fetchAllVehicles(supabase);

  const matchedVehicleIds = [
    ...new Set(
      rows
        .map((row) => vehiclesByNumber.get(row.vehicle_no)?.id)
        .filter(Boolean)
    ),
  ];
  const existingEntries = await fetchExistingEntries(supabase, matchedVehicleIds);
  const plan = buildImportPlan({ rows, vehiclesByNumber, existingEntries });
  const warningRowsCount = plan.rowsToInsert.filter((row) => row.warning_flag).length;

  if (invalidRows.length > 0) {
    console.log(`invalid rows skipped: ${invalidRows.length}`);
    console.table(invalidRows.slice(0, 25));
  }

  if (isDryRun) {
    console.log("DRY_RUN");
    console.log(`total rows found: ${rows.length + invalidRows.length}`);
    console.log(`rows valid: ${plan.validRows.length}`);
    console.log(
      `rows skipped due to missing vehicle: ${
        rows.length - plan.validRows.length
      }`
    );
    console.log(`duplicate rows skipped: ${plan.duplicateRows.length}`);
    console.log(`rows that would be inserted: ${plan.rowsToInsert.length}`);
    console.log(`warning rows count: ${warningRowsCount}`);
    if (plan.missingVehicleNumbers.length > 0) {
      console.log(
        `missing vehicle numbers: ${plan.missingVehicleNumbers.join(", ")}`
      );
    }
    return;
  }

  const insertedCount = await insertRows(supabase, plan.rowsToInsert);
  console.log(`inserted count: ${insertedCount}`);
  console.log(`skipped duplicate count: ${plan.duplicateRows.length}`);
  console.log(
    `missing vehicle numbers: ${
      plan.missingVehicleNumbers.length > 0
        ? plan.missingVehicleNumbers.join(", ")
        : "none"
    }`
  );
  console.log(`warning rows count: ${warningRowsCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
