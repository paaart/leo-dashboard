import "dotenv/config";
import { Pool } from "pg";

const API_BASE = process.env.FUEL_TRACKER_API_BASE ?? "http://localhost:3000";

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

const vehicles = [
  {
    vehicleNo: "KA01AA1001",
    vehicleType: "Container Truck",
    assignedDriver: "Ramesh Gowda",
    startingOdometer: 100000,
    profile: "Healthy 5.5-6.5 km/l",
    liters: [58, 62, 55, 64, 60, 66, 57, 63, 61, 59, 65, 56, 62, 60, 58, 64],
    mileages: [
      5.8, 6.1, 5.9, 6.2, 5.7, 6.0, 6.3, 5.8, 6.1, 5.9, 6.2, 5.6, 6.0,
      6.1, 5.9, 6.2,
    ],
  },
  {
    vehicleNo: "KA01AA1002",
    vehicleType: "Light Commercial Vehicle",
    assignedDriver: "Suresh Kumar",
    startingOdometer: 120000,
    profile: "Very efficient 7-8 km/l",
    liters: [42, 45, 48, 44, 46, 50, 43, 47, 49, 45, 44, 48, 46, 50, 43, 47],
    mileages: [
      7.2, 7.6, 7.4, 7.8, 7.3, 7.5, 7.9, 7.4, 7.7, 7.6, 7.2, 7.8, 7.5,
      7.3, 7.9, 7.6,
    ],
  },
  {
    vehicleNo: "KA01AA1003",
    vehicleType: "Heavy Duty Truck",
    assignedDriver: "Manjunath R",
    startingOdometer: 80000,
    profile: "Heavy usage 4-5 km/l",
    liters: [
      88, 94, 100, 92, 96, 104, 90, 98, 102, 95, 91, 99, 106, 93, 97, 101,
    ],
    mileages: [
      4.3, 4.6, 4.4, 4.8, 4.5, 4.2, 4.7, 4.4, 4.6, 4.3, 4.9, 4.5, 4.2,
      4.8, 4.4, 4.6,
    ],
  },
  {
    vehicleNo: "KA01AA1004",
    vehicleType: "Reefer Truck",
    assignedDriver: "Naveen Shetty",
    startingOdometer: 150000,
    profile: "Mileage gradually worsening",
    liters: [62, 64, 60, 66, 63, 65, 61, 64, 62, 66, 63, 65, 61, 64, 62, 66],
    mileages: [
      6.3, 6.2, 6.1, 6.2, 5.9, 5.8, 5.7, 5.6, 5.5, 5.2, 5.1, 5.0, 4.9,
      4.8, 4.9, 4.7,
    ],
  },
  {
    vehicleNo: "KA01AA1005",
    vehicleType: "Pickup Van",
    assignedDriver: "Prakash M",
    startingOdometer: 95000,
    profile: "Mostly normal with suspicious entries",
    liters: [
      50, 54, 48, 52, 55, 50, 58, 53, 52, 57, 51, 54, 49, 56, 52, 55, 50,
      53,
    ],
    mileages: [
      6.1, 6.0, 5.8, 6.2, 6.0, 1.9, 6.1, 5.9, 6.0, 5.8, 6.2, 5.9, 6.0,
      5.8, 6.1, 5.9, 6.0, 6.2,
    ],
    warningIndexes: new Set([7, 14]),
  },
];

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

async function post(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.ok === false) {
    throw new Error(`${path} failed ${response.status}: ${JSON.stringify(json)}`);
  }

  return json.data;
}

async function cleanupSeedVehicles() {
  const numbers = vehicles.map((vehicle) => vehicle.vehicleNo);

  await pool.query(
    `
    delete from public.fuel_entries fe
    using public.vehicles v
    where fe.vehicle_id = v.id
      and v.vehicle_no = any($1::text[])
    `,
    [numbers]
  );

  await pool.query(
    `
    delete from public.vehicles
    where vehicle_no = any($1::text[])
    `,
    [numbers]
  );
}

async function seedVehicle(vehicle, vehicleIndex) {
  const createdVehicle = await post("/api/vehicles", {
    vehicleNo: vehicle.vehicleNo,
    vehicleType: vehicle.vehicleType,
    assignedDriver: vehicle.assignedDriver,
    startingOdometer: vehicle.startingOdometer,
    status: "active",
  });

  let odometer = vehicle.startingOdometer;
  const startDate = addDays(new Date("2026-03-01T00:00:00.000Z"), vehicleIndex * 2);

  for (let index = 0; index < vehicle.liters.length; index += 1) {
    const liters = vehicle.liters[index];
    const targetMileage = vehicle.mileages[index];
    const normalDistance = round(liters * targetMileage, 0);
    const isWarning = vehicle.warningIndexes?.has(index) ?? false;

    const nextOdometer = isWarning
      ? round(odometer - (index === 7 ? 85 : 140), 0)
      : round(odometer + normalDistance, 0);

    odometer = nextOdometer;

    const dieselRate = 89 + ((index + vehicleIndex) % 6) * 0.85 + vehicleIndex * 0.25;
    const fuelAmount = round(liters * dieselRate, 2);
    const entryDate = dateOnly(addDays(startDate, index * 5));

    await post("/api/fuel-entries", {
      vehicleId: createdVehicle.id,
      driverName: vehicle.assignedDriver,
      driverMobile: `98765010${String(vehicleIndex + 1).padStart(2, "0")}`,
      fuelDate: entryDate,
      fuelAmount,
      fuelLiters: liters,
      odometerReading: nextOdometer,
      remarks: isWarning
        ? "Seed data: suspicious odometer progression for warning validation"
        : `Seed data: ${vehicle.profile}`,
    });
  }
}

async function printValidationSummary() {
  const numbers = vehicles.map((vehicle) => vehicle.vehicleNo);
  const summary = await pool.query(
    `
    select
      v.vehicle_no,
      round(coalesce(sum(case when fe.km_driven > 0 then fe.km_driven else 0 end), 0)::numeric, 2) as total_km,
      round(coalesce(sum(fe.fuel_amount), 0)::numeric, 2) as total_fuel_amount,
      round(coalesce(sum(fe.fuel_liters), 0)::numeric, 3) as total_liters,
      round(
        case
          when coalesce(sum(fe.fuel_liters), 0) > 0
            then (
              sum(case when fe.km_driven > 0 then fe.km_driven else 0 end)
              / sum(fe.fuel_liters)
            )
          else null
        end::numeric,
        2
      ) as average_mileage,
      round(
        case
          when coalesce(sum(case when fe.km_driven > 0 then fe.km_driven else 0 end), 0) > 0
            then (
              sum(fe.fuel_amount)
              / sum(case when fe.km_driven > 0 then fe.km_driven else 0 end)
            )
          else null
        end::numeric,
        2
      ) as cost_per_km,
      count(*) filter (where fe.warning_flag = true)::int as warning_count,
      count(fe.id)::int as entry_count
    from public.vehicles v
    left join public.fuel_entries fe on fe.vehicle_id = v.id
    where v.vehicle_no = any($1::text[])
    group by v.vehicle_no
    order by v.vehicle_no
    `,
    [numbers]
  );

  console.table(
    summary.rows.map((row) => ({
      vehicle_no: row.vehicle_no,
      total_km: Number(row.total_km),
      total_fuel_amount: Number(row.total_fuel_amount),
      total_liters: Number(row.total_liters),
      average_mileage: Number(row.average_mileage),
      cost_per_km: Number(row.cost_per_km),
      warning_count: Number(row.warning_count),
      entry_count: Number(row.entry_count),
    }))
  );
}

async function verifyDashboard() {
  const response = await fetch(`${API_BASE}/api/fuel-dashboard`);
  const json = await response.json();

  if (!response.ok || json.ok === false) {
    throw new Error(`Dashboard failed: ${JSON.stringify(json)}`);
  }

  const rows = json.data.filter((row) =>
    vehicles.some((vehicle) => vehicle.vehicleNo === row.vehicleNo)
  );

  console.log(`dashboard rows returned for seeded vehicles: ${rows.length}`);
  console.table(
    rows.map((row) => ({
      vehicleNo: row.vehicleNo,
      totalKm: round(row.totalKm, 2),
      totalFuelAmount: round(row.totalFuelAmount, 2),
      totalFuelLiters: round(row.totalFuelLiters, 3),
      averageMileage:
        row.averageMileage === null ? null : round(row.averageMileage, 2),
      averageCostPerKm:
        row.averageCostPerKm === null ? null : round(row.averageCostPerKm, 2),
      lastFuelDate: row.lastFuelDate,
      lastOdometerReading: row.lastOdometerReading,
    }))
  );
}

try {
  await cleanupSeedVehicles();

  for (let index = 0; index < vehicles.length; index += 1) {
    await seedVehicle(vehicles[index], index);
  }

  await printValidationSummary();
  await verifyDashboard();
  console.log("SEED_COMPLETE");
} finally {
  await pool.end();
}
