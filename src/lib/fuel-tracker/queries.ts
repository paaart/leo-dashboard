import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import { calculateFuelEntryValues } from "./calculations";
import type {
  FuelAnalyticsFilters,
  FuelAnalyticsInsight,
  FuelAnalyticsVehicleRow,
  FuelDashboardAnalytics,
  FuelDashboardSummary,
  FuelEntry,
  Vehicle,
  VehicleExpense,
  VehicleExpensePayment,
  VehicleExpensePaymentItem,
} from "./types";
import type {
  ValidFuelEntryInput,
  ValidVehicleExpenseInput,
  ValidVehicleInput,
} from "./validation";

function toDateOnly(value: unknown): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
}

function toVehicle(row: Record<string, unknown>): Vehicle {
  return {
    id: String(row.id),
    vehicle_no: String(row.vehicle_no),
    vehicle_type: String(row.vehicle_type),
    assigned_driver: row.assigned_driver ? String(row.assigned_driver) : null,
    starting_odometer: Number(row.starting_odometer),
    status: row.status as Vehicle["status"],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function toFuelEntry(row: Record<string, unknown>): FuelEntry {
  return {
    id: String(row.id),
    vehicle_id: String(row.vehicle_id),
    driver_name: row.driver_name ? String(row.driver_name) : null,
    driver_mobile: row.driver_mobile ? String(row.driver_mobile) : null,
    fuel_date: toDateOnly(row.fuel_date),
    fuel_amount: Number(row.fuel_amount),
    fuel_liters: Number(row.fuel_liters),
    odometer_reading: Number(row.odometer_reading),
    previous_odometer_reading:
      row.previous_odometer_reading === null
        ? null
        : Number(row.previous_odometer_reading),
    km_driven: row.km_driven === null ? null : Number(row.km_driven),
    approx_mileage:
      row.approx_mileage === null ? null : Number(row.approx_mileage),
    fuel_rate: row.fuel_rate === null ? null : Number(row.fuel_rate),
    cost_per_km: row.cost_per_km === null ? null : Number(row.cost_per_km),
    bill_image_path: row.bill_image_path ? String(row.bill_image_path) : null,
    meter_image_path: row.meter_image_path
      ? String(row.meter_image_path)
      : null,
    remarks: row.remarks ? String(row.remarks) : null,
    warning_flag: Boolean(row.warning_flag),
    warning_reason: row.warning_reason ? String(row.warning_reason) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function toVehicleExpense(row: Record<string, unknown>): VehicleExpense {
  return {
    id: String(row.id),
    expense_date: toDateOnly(row.expense_date),
    vehicle_id: row.vehicle_id ? String(row.vehicle_id) : null,
    expense_type: String(row.expense_type),
    description: row.description ? String(row.description) : null,
    amount: Number(row.amount),
    vendor: row.vendor ? String(row.vendor) : null,
    invoice_reference: row.invoice_reference
      ? String(row.invoice_reference)
      : null,
    city: row.city ? String(row.city) : null,
    payment_mode: row.payment_mode ? String(row.payment_mode) : null,
    company: row.company ? String(row.company) : null,
    status: String(row.status).toLowerCase() as VehicleExpense["status"],
    paid_at: row.paid_at ? String(row.paid_at) : null,
    payment_id: row.payment_id ? String(row.payment_id) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function toVehicleExpensePaymentItem(
  row: Record<string, unknown>
): VehicleExpensePaymentItem {
  return {
    id: String(row.id),
    payment_id: String(row.payment_id),
    expense_id: String(row.expense_id),
    expense_date: toDateOnly(row.expense_date),
    vehicle_id: row.vehicle_id ? String(row.vehicle_id) : null,
    vehicle_no: row.vehicle_no ? String(row.vehicle_no) : null,
    expense_type: String(row.expense_type),
    description: row.description ? String(row.description) : null,
    amount: Number(row.amount),
    vendor: row.vendor ? String(row.vendor) : null,
    created_at: String(row.created_at),
  };
}

function toVehicleExpensePayment(
  row: Record<string, unknown>,
  items: VehicleExpensePaymentItem[]
): VehicleExpensePayment {
  return {
    id: String(row.id),
    payment_date: toDateOnly(row.payment_date),
    payment_mode: row.payment_mode ? String(row.payment_mode) : null,
    reference_number: row.reference_number
      ? String(row.reference_number)
      : null,
    remarks: row.remarks ? String(row.remarks) : null,
    total_amount: Number(row.total_amount),
    expense_count: Number(row.expense_count ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    items,
  };
}

export async function createVehicle(input: ValidVehicleInput): Promise<Vehicle> {
  const result = await db.query(
    `
    insert into public.vehicles (
      vehicle_no,
      vehicle_type,
      assigned_driver,
      starting_odometer,
      status
    )
    values ($1, $2, $3, $4, $5)
    returning *
    `,
    [
      input.vehicle_no,
      input.vehicle_type,
      input.assigned_driver,
      input.starting_odometer,
      input.status,
    ]
  );

  return toVehicle(result.rows[0]);
}

export async function listVehicles(params: {
  status?: string | null;
  limit: number;
  offset: number;
}): Promise<Vehicle[]> {
  const where = params.status ? "where status = $1" : "";
  const values = params.status
    ? [params.status, params.limit, params.offset]
    : [params.limit, params.offset];
  const limitParam = params.status ? 2 : 1;
  const offsetParam = params.status ? 3 : 2;

  const result = await db.query(
    `
    select *
    from public.vehicles
    ${where}
    order by vehicle_no asc
    limit $${limitParam} offset $${offsetParam}
    `,
    values
  );

  return result.rows.map(toVehicle);
}

async function getVehicleForUpdate(client: PoolClient, vehicleId: string) {
  const result = await client.query<{
    id: string;
    starting_odometer: string | number;
  }>(
    `
    select id, starting_odometer
    from public.vehicles
    where id = $1
    for update
    `,
    [vehicleId]
  );

  return result.rows[0] ?? null;
}

async function getLatestFuelEntryForUpdate(
  client: PoolClient,
  vehicleId: string
) {
  const result = await client.query<{
    odometer_reading: string | number;
  }>(
    `
    select odometer_reading
    from public.fuel_entries
    where vehicle_id = $1
    order by fuel_date desc, created_at desc
    limit 1
    for update
    `,
    [vehicleId]
  );

  return result.rows[0] ?? null;
}

export async function createFuelEntry(
  input: ValidFuelEntryInput
): Promise<FuelEntry> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const vehicle = await getVehicleForUpdate(client, input.vehicle_id);
    if (!vehicle) {
      throw Object.assign(new Error("Vehicle not found"), { status: 404 });
    }

    const latestEntry = await getLatestFuelEntryForUpdate(
      client,
      input.vehicle_id
    );

    const previousOdometer = latestEntry
      ? Number(latestEntry.odometer_reading)
      : Number(vehicle.starting_odometer);

    const calculations = calculateFuelEntryValues({
      currentOdometer: input.odometer_reading,
      previousOdometer,
      fuelAmount: input.fuel_amount,
      fuelLiters: input.fuel_liters,
      allowBaselineEqual: !latestEntry,
    });

    const result = await client.query(
      `
      insert into public.fuel_entries (
        vehicle_id,
        driver_name,
        driver_mobile,
        fuel_date,
        fuel_amount,
        fuel_liters,
        odometer_reading,
        previous_odometer_reading,
        km_driven,
        approx_mileage,
        fuel_rate,
        cost_per_km,
        bill_image_path,
        meter_image_path,
        remarks,
        warning_flag,
        warning_reason
      )
      values (
        $1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17
      )
      returning *
      `,
      [
        input.vehicle_id,
        input.driver_name,
        input.driver_mobile,
        input.fuel_date,
        input.fuel_amount,
        input.fuel_liters,
        input.odometer_reading,
        calculations.previous_odometer_reading,
        calculations.km_driven,
        calculations.approx_mileage,
        calculations.fuel_rate,
        calculations.cost_per_km,
        input.bill_image_path,
        input.meter_image_path,
        input.remarks,
        calculations.warning_flag,
        calculations.warning_reason,
      ]
    );

    await client.query("COMMIT");
    return toFuelEntry(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listFuelEntries(params: {
  vehicleId?: string | null;
  limit: number;
  offset: number;
}): Promise<FuelEntry[]> {
  const where = params.vehicleId ? "where vehicle_id = $1" : "";
  const values = params.vehicleId
    ? [params.vehicleId, params.limit, params.offset]
    : [params.limit, params.offset];
  const limitParam = params.vehicleId ? 2 : 1;
  const offsetParam = params.vehicleId ? 3 : 2;

  const result = await db.query(
    `
    select *
    from public.fuel_entries
    ${where}
    order by fuel_date desc, created_at desc
    limit $${limitParam} offset $${offsetParam}
    `,
    values
  );

  return result.rows.map(toFuelEntry);
}

export async function createVehicleExpense(
  input: ValidVehicleExpenseInput
): Promise<VehicleExpense> {
  const result = await db.query(
    `
    insert into public.vehicle_expenses (
      expense_date,
      vehicle_id,
      expense_type,
      description,
      amount,
      vendor,
      invoice_reference,
      city,
      payment_mode,
      company,
      status
    )
    values ($1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    returning *
    `,
    [
      input.expense_date,
      input.vehicle_id,
      input.expense_type,
      input.description,
      input.amount,
      input.vendor,
      input.invoice_reference,
      input.city,
      input.payment_mode,
      input.company,
      input.status,
    ]
  );

  return toVehicleExpense(result.rows[0]);
}

export async function listVehicleExpenses(params: {
  vehicleId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  limit: number;
  offset: number;
}): Promise<VehicleExpense[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (params.vehicleId) {
    values.push(params.vehicleId);
    clauses.push(`vehicle_id = $${values.length}`);
  }

  if (params.fromDate) {
    values.push(params.fromDate);
    clauses.push(`expense_date >= $${values.length}::date`);
  }

  if (params.toDate) {
    values.push(params.toDate);
    clauses.push(`expense_date <= $${values.length}::date`);
  }

  values.push(params.limit);
  const limitParam = values.length;
  values.push(params.offset);
  const offsetParam = values.length;

  const result = await db.query(
    `
    select *
    from public.vehicle_expenses
    ${clauses.length ? `where ${clauses.join(" and ")}` : ""}
    order by expense_date desc, created_at desc
    limit $${limitParam} offset $${offsetParam}
    `,
    values
  );

  return result.rows.map(toVehicleExpense);
}

export async function listVehicleExpensePayments(params: {
  fromDate?: string | null;
  toDate?: string | null;
  paymentMode?: string | null;
  limit: number;
  offset: number;
}): Promise<VehicleExpensePayment[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (params.fromDate) {
    values.push(params.fromDate);
    clauses.push(`p.payment_date >= $${values.length}::date`);
  }

  if (params.toDate) {
    values.push(params.toDate);
    clauses.push(`p.payment_date <= $${values.length}::date`);
  }

  if (params.paymentMode) {
    values.push(params.paymentMode);
    clauses.push(`p.payment_mode = $${values.length}`);
  }

  values.push(params.limit);
  const limitParam = values.length;
  values.push(params.offset);
  const offsetParam = values.length;

  const paymentsResult = await db.query(
    `
    select
      p.*,
      count(i.id)::int as expense_count
    from public.vehicle_expense_payments p
    left join public.vehicle_expense_payment_items i on i.payment_id = p.id
    ${clauses.length ? `where ${clauses.join(" and ")}` : ""}
    group by p.id
    order by p.payment_date desc, p.created_at desc
    limit $${limitParam} offset $${offsetParam}
    `,
    values
  );

  if (paymentsResult.rows.length === 0) return [];

  const paymentIds = paymentsResult.rows.map((row) => row.id);
  const itemsResult = await db.query(
    `
    select
      i.id,
      i.payment_id,
      i.expense_id,
      i.amount,
      i.created_at,
      e.expense_date,
      e.vehicle_id,
      e.expense_type,
      e.description,
      e.vendor,
      v.vehicle_no
    from public.vehicle_expense_payment_items i
    join public.vehicle_expenses e on e.id = i.expense_id
    left join public.vehicles v on v.id = e.vehicle_id
    where i.payment_id = any($1::uuid[])
    order by e.expense_date desc, e.created_at desc
    `,
    [paymentIds]
  );

  const itemsByPaymentId = new Map<string, VehicleExpensePaymentItem[]>();
  for (const row of itemsResult.rows) {
    const item = toVehicleExpensePaymentItem(row);
    const items = itemsByPaymentId.get(item.payment_id) ?? [];
    items.push(item);
    itemsByPaymentId.set(item.payment_id, items);
  }

  return paymentsResult.rows.map((row) =>
    toVehicleExpensePayment(row, itemsByPaymentId.get(String(row.id)) ?? [])
  );
}

export async function createVehicleExpensePayment(input: {
  paymentDate: string;
  paymentMode: string | null;
  referenceNumber: string | null;
  remarks: string | null;
  expenseIds: string[];
}): Promise<VehicleExpensePayment> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const expenseResult = await client.query<{
      id: string;
      amount: string | number;
    }>(
      `
      select id, amount
      from public.vehicle_expenses
      where id = any($1::uuid[])
        and status = 'pending'
      order by expense_date asc, created_at asc
      for update
      `,
      [input.expenseIds]
    );

    if (expenseResult.rows.length !== input.expenseIds.length) {
      throw Object.assign(
        new Error("Only pending expenses can be selected for payment"),
        { status: 400 }
      );
    }

    const totalAmount = expenseResult.rows.reduce(
      (sum, row) => sum + Number(row.amount),
      0
    );

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw Object.assign(new Error("Selected expenses total must be > 0"), {
        status: 400,
      });
    }

    const paymentResult = await client.query(
      `
      insert into public.vehicle_expense_payments (
        payment_date,
        payment_mode,
        reference_number,
        remarks,
        total_amount
      )
      values ($1::date, $2, $3, $4, $5::numeric(12,2))
      returning *
      `,
      [
        input.paymentDate,
        input.paymentMode,
        input.referenceNumber,
        input.remarks,
        totalAmount,
      ]
    );

    const paymentId = String(paymentResult.rows[0].id);

    for (const expense of expenseResult.rows) {
      await client.query(
        `
        insert into public.vehicle_expense_payment_items (
          payment_id,
          expense_id,
          amount
        )
        values ($1::uuid, $2::uuid, $3::numeric(12,2))
        `,
        [paymentId, expense.id, Number(expense.amount)]
      );
    }

    await client.query(
      `
      update public.vehicle_expenses
      set
        status = 'paid',
        paid_at = now(),
        payment_id = $1::uuid,
        updated_at = now()
      where id = any($2::uuid[])
        and status = 'pending'
      `,
      [paymentId, input.expenseIds]
    );

    await client.query("COMMIT");

    const rows = await listVehicleExpensePayments({
      limit: 1,
      offset: 0,
    });
    return rows.find((row) => row.id === paymentId) ?? toVehicleExpensePayment(
      { ...paymentResult.rows[0], expense_count: input.expenseIds.length },
      []
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getFuelDashboardSummary(): Promise<
  FuelDashboardSummary[]
> {
  const result = await db.query(
    `
    with entry_totals as (
      select
        vehicle_id,
        coalesce(sum(case when km_driven > 0 then km_driven else 0 end), 0) as total_km,
        coalesce(sum(fuel_amount), 0) as total_fuel_amount,
        coalesce(sum(fuel_liters), 0) as total_fuel_liters,
        max(fuel_date) as last_fuel_date
      from public.fuel_entries
      group by vehicle_id
    ),
    latest_entry as (
      select distinct on (vehicle_id)
        vehicle_id,
        fuel_date,
        odometer_reading
      from public.fuel_entries
      order by vehicle_id, fuel_date desc, created_at desc
    )
    select
      v.id as vehicle_id,
      v.vehicle_no,
      coalesce(et.total_km, 0) as total_km,
      coalesce(et.total_fuel_amount, 0) as total_fuel_amount,
      coalesce(et.total_fuel_liters, 0) as total_fuel_liters,
      case
        when coalesce(et.total_fuel_liters, 0) > 0
          then et.total_km / et.total_fuel_liters
        else null
      end as average_mileage,
      case
        when coalesce(et.total_km, 0) > 0
          then et.total_fuel_amount / et.total_km
        else null
      end as average_cost_per_km,
      le.fuel_date as last_fuel_date,
      le.odometer_reading as last_odometer_reading
    from public.vehicles v
    left join entry_totals et on et.vehicle_id = v.id
    left join latest_entry le on le.vehicle_id = v.id
    order by v.vehicle_no asc
    `
  );

  return result.rows.map((row) => ({
    vehicleId: String(row.vehicle_id),
    vehicleNo: String(row.vehicle_no),
    totalKm: Number(row.total_km),
    totalFuelAmount: Number(row.total_fuel_amount),
    totalFuelLiters: Number(row.total_fuel_liters),
    averageMileage:
      row.average_mileage === null ? null : Number(row.average_mileage),
    averageCostPerKm:
      row.average_cost_per_km === null
        ? null
        : Number(row.average_cost_per_km),
    lastFuelDate: row.last_fuel_date ? toDateOnly(row.last_fuel_date) : null,
    lastOdometerReading:
      row.last_odometer_reading === null
        ? null
        : Number(row.last_odometer_reading),
  }));
}

function emptyInsight(): FuelAnalyticsInsight {
  return { vehicleId: null, vehicleNo: null, value: null };
}

function toInsight(
  row: FuelAnalyticsVehicleRow | undefined,
  value: number | null | undefined
): FuelAnalyticsInsight {
  if (!row || value === null || value === undefined) return emptyInsight();

  return {
    vehicleId: row.vehicleId,
    vehicleNo: row.vehicleNo,
    value,
  };
}

function analyticsWhere(filters: FuelAnalyticsFilters) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters.vehicleId) {
    values.push(filters.vehicleId);
    clauses.push(`fe.vehicle_id = $${values.length}`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    clauses.push(`fe.fuel_date >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    clauses.push(`fe.fuel_date <= $${values.length}::date`);
  }

  return {
    sql: clauses.length ? `where ${clauses.join(" and ")}` : "",
    values,
  };
}

function expenseAnalyticsWhere(filters: FuelAnalyticsFilters) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters.vehicleId) {
    values.push(filters.vehicleId);
    clauses.push(`ve.vehicle_id = $${values.length}`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    clauses.push(`ve.expense_date >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    clauses.push(`ve.expense_date <= $${values.length}::date`);
  }

  return {
    sql: clauses.length ? `where ${clauses.join(" and ")}` : "",
    values,
  };
}

export async function getFuelDashboardAnalytics(
  filters: FuelAnalyticsFilters
): Promise<FuelDashboardAnalytics> {
  const where = analyticsWhere(filters);
  const expenseWhere = expenseAnalyticsWhere(filters);
  const vehicleFilterValues: unknown[] = [];
  const vehicleFilterSql = filters.vehicleId
    ? `where v.id = $${where.values.length + 1}`
    : "";

  if (filters.vehicleId) vehicleFilterValues.push(filters.vehicleId);

  const vehicleResult = await db.query(
    `
    with filtered_entries as (
      select fe.*
      from public.fuel_entries fe
      ${where.sql}
    ),
    vehicle_base as (
      select v.id, v.vehicle_no
      from public.vehicles v
      ${vehicleFilterSql}
    ),
    latest_entry as (
      select distinct on (fe.vehicle_id)
        fe.vehicle_id,
        fe.fuel_date,
        fe.odometer_reading
      from filtered_entries fe
      order by fe.vehicle_id, fe.fuel_date desc, fe.created_at desc
    ),
    vehicle_totals as (
      select
        vb.id as vehicle_id,
        vb.vehicle_no,
        coalesce(sum(fe.fuel_amount), 0) as total_fuel_amount,
        coalesce(sum(fe.fuel_liters), 0) as total_liters,
        coalesce(
          sum(
            case
              when fe.km_driven > 0 and fe.warning_flag = false
                then fe.km_driven
              else 0
            end
          ),
          0
        ) as valid_km,
        coalesce(
          sum(
            case
              when fe.km_driven > 0 and fe.warning_flag = false
                then fe.fuel_liters
              else 0
            end
          ),
          0
        ) as valid_liters,
        coalesce(
          sum(
            case
              when fe.km_driven > 0 and fe.warning_flag = false
                then fe.fuel_amount
              else 0
            end
          ),
          0
        ) as valid_fuel_amount,
        count(fe.id) filter (where fe.warning_flag = true)::int as warning_count
      from vehicle_base vb
      left join filtered_entries fe on fe.vehicle_id = vb.id
      group by vb.id, vb.vehicle_no
    ),
    fleet as (
      select
        case
          when sum(valid_liters) > 0 then sum(valid_km) / sum(valid_liters)
          else null
        end as fleet_average_mileage
      from vehicle_totals
    )
    select
      vt.vehicle_id,
      vt.vehicle_no,
      vt.total_fuel_amount,
      vt.total_liters,
      vt.valid_km as total_km,
      case
        when vt.valid_liters > 0 then vt.valid_km / vt.valid_liters
        else null
      end as average_mileage,
      case
        when vt.valid_km > 0 then vt.valid_fuel_amount / vt.valid_km
        else null
      end as cost_per_km,
      vt.warning_count,
      le.fuel_date as last_fuel_date,
      le.odometer_reading as last_odometer,
      case
        when vt.valid_liters <= 0 or f.fleet_average_mileage is null then 'none'
        when (vt.valid_km / vt.valid_liters) >= f.fleet_average_mileage * 1.1 then 'good'
        when (vt.valid_km / vt.valid_liters) <= f.fleet_average_mileage * 0.9 then 'low'
        else 'normal'
      end as deviation_status
    from vehicle_totals vt
    cross join fleet f
    left join latest_entry le on le.vehicle_id = vt.vehicle_id
    order by vt.vehicle_no asc
    `,
    [...where.values, ...vehicleFilterValues]
  );

  const vehicles: FuelAnalyticsVehicleRow[] = vehicleResult.rows.map((row) => ({
    vehicleId: String(row.vehicle_id),
    vehicleNo: String(row.vehicle_no),
    totalKm: Number(row.total_km ?? 0),
    totalLiters: Number(row.total_liters ?? 0),
    totalFuelAmount: Number(row.total_fuel_amount ?? 0),
    averageMileage:
      row.average_mileage === null ? null : Number(row.average_mileage),
    costPerKm: row.cost_per_km === null ? null : Number(row.cost_per_km),
    warningCount: Number(row.warning_count ?? 0),
    lastFuelDate: row.last_fuel_date ? toDateOnly(row.last_fuel_date) : null,
    lastOdometer:
      row.last_odometer === null || row.last_odometer === undefined
        ? null
        : Number(row.last_odometer),
    deviationStatus: row.deviation_status,
  }));

  const summary = vehicles.reduce(
    (acc, row) => {
      acc.totalFuelSpend += row.totalFuelAmount;
      acc.totalFuelLiters += row.totalLiters;
      acc.totalKmDriven += row.totalKm;
      acc.warningEntries += row.warningCount;
      return acc;
    },
    {
      totalFuelSpend: 0,
      totalOtherExpenses: 0,
      totalVehicleOperatingCost: 0,
      totalFuelLiters: 0,
      totalKmDriven: 0,
      averageMileage: null as number | null,
      averageCostPerKm: null as number | null,
      warningEntries: 0,
    }
  );

  const expenseTotals = await db.query(
    `
    select coalesce(sum(ve.amount), 0) as total_other_expenses
    from public.vehicle_expenses ve
    ${expenseWhere.sql}
    `,
    expenseWhere.values
  );

  summary.totalOtherExpenses = Number(
    expenseTotals.rows[0]?.total_other_expenses ?? 0
  );
  summary.totalVehicleOperatingCost =
    summary.totalFuelSpend + summary.totalOtherExpenses;

  const validTotals = await db.query(
    `
    select
      coalesce(sum(case when fe.km_driven > 0 and fe.warning_flag = false then fe.km_driven else 0 end), 0) as valid_km,
      coalesce(sum(case when fe.km_driven > 0 and fe.warning_flag = false then fe.fuel_liters else 0 end), 0) as valid_liters,
      coalesce(sum(case when fe.km_driven > 0 and fe.warning_flag = false then fe.fuel_amount else 0 end), 0) as valid_fuel_amount
    from public.fuel_entries fe
    ${where.sql}
    `,
    where.values
  );

  const validKm = Number(validTotals.rows[0]?.valid_km ?? 0);
  const validLiters = Number(validTotals.rows[0]?.valid_liters ?? 0);
  const validFuelAmount = Number(validTotals.rows[0]?.valid_fuel_amount ?? 0);
  summary.averageMileage = validLiters > 0 ? validKm / validLiters : null;
  summary.averageCostPerKm = validKm > 0 ? validFuelAmount / validKm : null;

  const bestMileageVehicle = vehicles
    .filter((row) => row.averageMileage !== null)
    .sort((a, b) => (b.averageMileage ?? 0) - (a.averageMileage ?? 0))[0];
  const lowestMileageVehicle = vehicles
    .filter((row) => row.averageMileage !== null)
    .sort((a, b) => (a.averageMileage ?? 0) - (b.averageMileage ?? 0))[0];
  const highestFuelSpendVehicle = [...vehicles].sort(
    (a, b) => b.totalFuelAmount - a.totalFuelAmount
  )[0];
  const mostWarningEntriesVehicle = [...vehicles].sort(
    (a, b) => b.warningCount - a.warningCount
  )[0];

  const monthlyResult = await db.query(
    `
    with filtered_entries as (
      select fe.*
      from public.fuel_entries fe
      ${where.sql}
    )
    select
      to_char(date_trunc('month', fuel_date), 'YYYY-MM') as month,
      coalesce(sum(fuel_amount), 0) as total_fuel_amount,
      coalesce(sum(fuel_liters), 0) as total_liters,
      coalesce(
        sum(
          case
            when km_driven > 0 and warning_flag = false then km_driven
            else 0
          end
        ),
        0
      ) as total_km,
      case
        when coalesce(sum(case when km_driven > 0 and warning_flag = false then fuel_liters else 0 end), 0) > 0
          then
            sum(case when km_driven > 0 and warning_flag = false then km_driven else 0 end)
            / sum(case when km_driven > 0 and warning_flag = false then fuel_liters else 0 end)
        else null
      end as average_mileage,
      case
        when coalesce(sum(case when km_driven > 0 and warning_flag = false then km_driven else 0 end), 0) > 0
          then
            sum(case when km_driven > 0 and warning_flag = false then fuel_amount else 0 end)
            / sum(case when km_driven > 0 and warning_flag = false then km_driven else 0 end)
        else null
      end as cost_per_km
    from filtered_entries
    group by date_trunc('month', fuel_date)
    order by month desc
    `,
    where.values
  );

  return {
    summary,
    vehicles,
    insights: {
      bestMileageVehicle: toInsight(
        bestMileageVehicle,
        bestMileageVehicle?.averageMileage
      ),
      lowestMileageVehicle: toInsight(
        lowestMileageVehicle,
        lowestMileageVehicle?.averageMileage
      ),
      highestFuelSpendVehicle: toInsight(
        highestFuelSpendVehicle,
        highestFuelSpendVehicle?.totalFuelAmount
      ),
      mostWarningEntriesVehicle: toInsight(
        mostWarningEntriesVehicle,
        mostWarningEntriesVehicle?.warningCount
      ),
    },
    monthlyBreakdown: monthlyResult.rows.map((row) => ({
      month: String(row.month),
      totalFuelAmount: Number(row.total_fuel_amount ?? 0),
      totalLiters: Number(row.total_liters ?? 0),
      totalKm: Number(row.total_km ?? 0),
      averageMileage:
        row.average_mileage === null ? null : Number(row.average_mileage),
      costPerKm: row.cost_per_km === null ? null : Number(row.cost_per_km),
    })),
  };
}
