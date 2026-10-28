import { db } from "@/lib/db";
import type { InventoryPurchase, InventoryVendor } from "./types";

const vendorColumns = `v.id::text as "id", v.name, v.phone, v.email, v.address, v.notes,
  v.is_active as "isActive", v.created_at::text as "createdAt", v.updated_at::text as "updatedAt"`;

export async function listVendors(
  includeInactive = false,
): Promise<InventoryVendor[]> {
  const result = await db.query<InventoryVendor>(
    `select ${vendorColumns}, count(p.id)::int as "purchaseCount",
    coalesce(sum(p.quantity * p.unit_price), 0)::numeric as "totalSpend"
    from public.vendors v left join public.inventory_purchases p on p.vendor_id = v.id
    where ($1::boolean or v.is_active) group by v.id order by v.is_active desc, lower(v.name)`,
    [includeInactive],
  );
  return result.rows.map((row) => ({
    ...row,
    totalSpend: Number(row.totalSpend ?? 0),
    purchaseCount: Number(row.purchaseCount ?? 0),
  }));
}

export async function createVendor(input: {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}) {
  const result = await db.query<InventoryVendor>(
    `insert into public.vendors (name, phone, email, address, notes)
    values ($1,$2,$3,$4,$5) returning ${vendorColumns}`,
    [
      input.name,
      input.phone ?? null,
      input.email ?? null,
      input.address ?? null,
      input.notes ?? null,
    ],
  );
  return result.rows[0];
}

export async function updateVendor(
  id: string,
  input: Partial<{
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    isActive: boolean;
  }>,
) {
  const result = await db.query<InventoryVendor>(
    `update public.vendors set
    name = coalesce($2,name), phone = case when $3::boolean then $4 else phone end,
    email = case when $5::boolean then $6 else email end, address = case when $7::boolean then $8 else address end,
    notes = case when $9::boolean then $10 else notes end, is_active = coalesce($11,is_active), updated_at = now()
    where id = $1::uuid returning ${vendorColumns}`,
    [
      id,
      input.name ?? null,
      input.phone !== undefined,
      input.phone ?? null,
      input.email !== undefined,
      input.email ?? null,
      input.address !== undefined,
      input.address ?? null,
      input.notes !== undefined,
      input.notes ?? null,
      input.isActive ?? null,
    ],
  );
  return result.rows[0] ?? null;
}

const purchaseColumns = `p.id::text as "id", p.branch_id::text as "branchId", b.name as "branchName",
  p.material_id::text as "materialId", m.name as "materialName", m.unit as "materialUnit",
  p.vendor_id::text as "vendorId", v.name as "vendorName", to_char(p.purchase_date,'YYYY-MM-DD') as "purchaseDate",
  p.quantity, p.unit_price::numeric as "unitPrice", (p.quantity*p.unit_price)::numeric as "totalAmount",
  p.invoice_path as "invoicePath", p.notes, coalesce(pr.full_name,pr.username) as "createdBy", p.created_at::text as "createdAt"`;

export async function listPurchases(
  branchIds: string[] | "all",
  filters: {
    materialId?: string;
    vendorId?: string;
    from?: string;
    to?: string;
  } = {},
): Promise<InventoryPurchase[]> {
  const result = await db.query<InventoryPurchase>(
    `with base as (
    select ${purchaseColumns}, (select avg(previous.unit_price) from public.inventory_purchases previous
      where previous.material_id = p.material_id and previous.purchase_date >= p.purchase_date - interval '6 months'
        and previous.purchase_date < p.purchase_date) as "sixMonthAverage"
    from public.inventory_purchases p join public.inventory_branches b on b.id=p.branch_id
      join public.inventory_materials m on m.id=p.material_id join public.vendors v on v.id=p.vendor_id
      join public.profiles pr on pr.id=p.created_by
    where ($1::boolean or p.branch_id = any($2::uuid[])) and ($3::uuid is null or p.material_id=$3)
      and ($4::uuid is null or p.vendor_id=$4) and ($5::date is null or p.purchase_date >= $5)
      and ($6::date is null or p.purchase_date <= $6)
  ) select *, case when "sixMonthAverage" is null then 'no_history'
    when "unitPrice" <= "sixMonthAverage" * .95 then 'good'
    when "unitPrice" >= "sixMonthAverage" * 1.05 then 'high' else 'normal' end as "priceSignal"
    from base order by "purchaseDate" desc, "createdAt" desc limit 500`,
    [
      branchIds === "all",
      branchIds === "all" ? [] : branchIds,
      filters.materialId ?? null,
      filters.vendorId ?? null,
      filters.from ?? null,
      filters.to ?? null,
    ],
  );
  return result.rows.map((row) => ({
    ...row,
    unitPrice: Number(row.unitPrice),
    totalAmount: Number(row.totalAmount),
    sixMonthAverage:
      row.sixMonthAverage === null ? null : Number(row.sixMonthAverage),
  }));
}

export async function createPurchase(input: {
  branchId: string;
  materialId: string;
  vendorId: string;
  purchaseDate: string;
  quantity: number;
  unitPrice: number;
  invoicePath?: string | null;
  notes?: string | null;
  createdBy: string;
}) {
  const result = await db.query(
    `insert into public.inventory_purchases (branch_id, material_id, vendor_id, purchase_date, quantity, unit_price, invoice_path, notes, created_by)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id::text`,
    [
      input.branchId,
      input.materialId,
      input.vendorId,
      input.purchaseDate,
      input.quantity,
      input.unitPrice,
      input.invoicePath ?? null,
      input.notes ?? null,
      input.createdBy,
    ],
  );
  return result.rows[0].id as string;
}
