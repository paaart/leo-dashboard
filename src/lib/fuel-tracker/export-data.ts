import { db } from "@/lib/db";
import type { FuelAnalyticsFilters } from "./types";

export type VehicleTrackerExportVehicle = {
  id: string;
  vehicleNo: string;
  vehicleType: string;
  company: string | null;
};

export type VehicleTrackerExportFuelEntry = {
  id: string;
  fuelDate: string;
  vehicleId: string;
  vehicleNo: string;
  vehicleType: string;
  company: string | null;
  driverName: string | null;
  driverMobile: string | null;
  fuelAmount: number;
  fuelLiters: number;
  fuelRate: number | null;
  odometerReading: number;
  previousOdometerReading: number | null;
  kmDriven: number | null;
  approxMileage: number | null;
  costPerKm: number | null;
  warningFlag: boolean;
  warningReason: string | null;
  remarks: string | null;
  hasBillProof: boolean;
  hasMeterProof: boolean;
  createdAt: string;
};

export type VehicleTrackerExportExpenseEntry = {
  itemId: string;
  invoiceId: string;
  invoiceDate: string;
  dueDate: string | null;
  vendorName: string;
  invoiceNumber: string | null;
  invoiceStatus: string;
  invoiceTotal: number;
  invoicePaid: number;
  invoiceBalance: number;
  vehicles: VehicleTrackerExportVehicle[];
  expenseType: string;
  description: string | null;
  amount: number;
  invoiceRemarks: string | null;
  createdAt: string;
};

export type VehicleTrackerExportData = {
  selectedVehicle: VehicleTrackerExportVehicle | null;
  fuelEntries: VehicleTrackerExportFuelEntry[];
  expenseEntries: VehicleTrackerExportExpenseEntry[];
};

function toDateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapVehicle(value: unknown): VehicleTrackerExportVehicle | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  return {
    id: String(row.id),
    vehicleNo: String(row.vehicle_no),
    vehicleType: String(row.vehicle_type),
    company: row.company ? String(row.company) : null,
  };
}

function fuelWhere(filters: FuelAnalyticsFilters) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters.vehicleId) {
    values.push(filters.vehicleId);
    clauses.push(`fe.vehicle_id = $${values.length}::uuid`);
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

function expenseWhere(filters: FuelAnalyticsFilters) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters.vehicleId) {
    values.push(filters.vehicleId);
    const vehicleParam = `$${values.length}::uuid`;
    clauses.push(`(
      ii.vehicle_id = ${vehicleParam}
      or exists (
        select 1
        from public.vehicle_expense_invoice_item_vehicles filtered_iiv
        where filtered_iiv.invoice_item_id = ii.id
          and filtered_iiv.vehicle_id = ${vehicleParam}
      )
    )`);
  }
  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    clauses.push(`i.invoice_date >= $${values.length}::date`);
  }
  if (filters.dateTo) {
    values.push(filters.dateTo);
    clauses.push(`i.invoice_date <= $${values.length}::date`);
  }

  return {
    sql: clauses.length ? `where ${clauses.join(" and ")}` : "",
    values,
  };
}

export async function getVehicleTrackerExportData(
  filters: FuelAnalyticsFilters
): Promise<VehicleTrackerExportData> {
  const fuelFilter = fuelWhere(filters);
  const expenseFilter = expenseWhere(filters);

  const [selectedVehicleResult, fuelResult, expenseResult] = await Promise.all([
    filters.vehicleId
      ? db.query(
          `
          select id, vehicle_no, vehicle_type, company
          from public.vehicles
          where id = $1::uuid
          `,
          [filters.vehicleId]
        )
      : Promise.resolve({ rows: [] }),
    db.query(
      `
      select
        fe.*,
        v.vehicle_no,
        v.vehicle_type,
        coalesce(fe.company, v.company) as export_company
      from public.fuel_entries fe
      join public.vehicles v on v.id = fe.vehicle_id
      ${fuelFilter.sql}
      order by fe.fuel_date asc, v.vehicle_no asc, fe.created_at asc
      `,
      fuelFilter.values
    ),
    db.query(
      `
      select
        ii.id as item_id,
        i.id as invoice_id,
        i.invoice_date,
        i.due_date,
        i.vendor_name,
        i.invoice_number,
        i.total_amount as invoice_total,
        coalesce(paid.paid_amount, 0) as invoice_paid,
        i.total_amount - coalesce(paid.paid_amount, 0) as invoice_balance,
        case
          when round((i.total_amount - coalesce(paid.paid_amount, 0))::numeric, 2) <= 0 then 'paid'
          when round(coalesce(paid.paid_amount, 0)::numeric, 2) > 0 then 'partially_paid'
          else 'unpaid'
        end as invoice_status,
        coalesce(associated.vehicles, '[]'::jsonb) as vehicles,
        ii.expense_type,
        ii.description,
        ii.amount,
        i.remarks as invoice_remarks,
        ii.created_at
      from public.vehicle_expense_invoices i
      join public.vehicle_expense_invoice_items ii on ii.invoice_id = i.id
      left join lateral (
        select coalesce(sum(a.allocated_amount), 0) as paid_amount
        from public.vehicle_expense_payment_allocations a
        where a.invoice_id = i.id
      ) paid on true
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', v.id,
            'vehicle_no', v.vehicle_no,
            'vehicle_type', v.vehicle_type,
            'company', v.company
          )
          order by v.vehicle_no
        ) as vehicles
        from public.vehicles v
        where
          v.id = ii.vehicle_id
          or exists (
            select 1
            from public.vehicle_expense_invoice_item_vehicles iiv
            where iiv.invoice_item_id = ii.id
              and iiv.vehicle_id = v.id
          )
      ) associated on true
      ${expenseFilter.sql}
      order by i.invoice_date asc, i.created_at asc, ii.created_at asc
      `,
      expenseFilter.values
    ),
  ]);

  const selectedVehicle = mapVehicle(selectedVehicleResult.rows[0]);
  if (filters.vehicleId && !selectedVehicle) {
    throw Object.assign(new Error("Vehicle not found"), { status: 404 });
  }

  return {
    selectedVehicle,
    fuelEntries: fuelResult.rows.map((row) => ({
      id: String(row.id),
      fuelDate: toDateOnly(row.fuel_date),
      vehicleId: String(row.vehicle_id),
      vehicleNo: String(row.vehicle_no),
      vehicleType: String(row.vehicle_type),
      company: row.export_company ? String(row.export_company) : null,
      driverName: row.driver_name ? String(row.driver_name) : null,
      driverMobile: row.driver_mobile ? String(row.driver_mobile) : null,
      fuelAmount: Number(row.fuel_amount),
      fuelLiters: Number(row.fuel_liters),
      fuelRate: row.fuel_rate === null ? null : Number(row.fuel_rate),
      odometerReading: Number(row.odometer_reading),
      previousOdometerReading:
        row.previous_odometer_reading === null
          ? null
          : Number(row.previous_odometer_reading),
      kmDriven: row.km_driven === null ? null : Number(row.km_driven),
      approxMileage:
        row.approx_mileage === null ? null : Number(row.approx_mileage),
      costPerKm: row.cost_per_km === null ? null : Number(row.cost_per_km),
      warningFlag: Boolean(row.warning_flag),
      warningReason: row.warning_reason ? String(row.warning_reason) : null,
      remarks: row.remarks ? String(row.remarks) : null,
      hasBillProof: Boolean(row.bill_image_path),
      hasMeterProof: Boolean(row.meter_image_path),
      createdAt: toIso(row.created_at),
    })),
    expenseEntries: expenseResult.rows.map((row) => ({
      itemId: String(row.item_id),
      invoiceId: String(row.invoice_id),
      invoiceDate: toDateOnly(row.invoice_date),
      dueDate: row.due_date ? toDateOnly(row.due_date) : null,
      vendorName: String(row.vendor_name),
      invoiceNumber: row.invoice_number ? String(row.invoice_number) : null,
      invoiceStatus: String(row.invoice_status),
      invoiceTotal: Number(row.invoice_total),
      invoicePaid: Number(row.invoice_paid),
      invoiceBalance: Number(row.invoice_balance),
      vehicles: Array.isArray(row.vehicles)
        ? row.vehicles
            .map((vehicle: unknown) => mapVehicle(vehicle))
            .filter(
              (
                vehicle: VehicleTrackerExportVehicle | null
              ): vehicle is VehicleTrackerExportVehicle =>
                vehicle !== null
            )
        : [],
      expenseType: String(row.expense_type),
      description: row.description ? String(row.description) : null,
      amount: Number(row.amount),
      invoiceRemarks: row.invoice_remarks
        ? String(row.invoice_remarks)
        : null,
      createdAt: toIso(row.created_at),
    })),
  };
}
