import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function clampPositiveInt(
  value: string | null,
  fallback: number,
  max?: number
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  if (max && parsed > max) return max;

  return parsed;
}

function isISODate(value: string | null) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = clampPositiveInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = clampPositiveInt(
    searchParams.get("pageSize"),
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
  );
  const offset = (page - 1) * pageSize;

  const search = searchParams.get("search")?.trim() ?? "";
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const locationName = searchParams.get("locationName")?.trim() ?? "";
  const modeOfPayment = searchParams.get("modeOfPayment")?.trim() ?? "";

  if (fromDate && !isISODate(fromDate)) {
    return NextResponse.json(
      { ok: false, error: "fromDate must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  if (toDate && !isISODate(toDate)) {
    return NextResponse.json(
      { ok: false, error: "toDate must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const client = await db.connect();

  try {
    const whereParts = [`t.type = 'payment'::warehouse_tx_type`];
    const values: Array<string | number> = [];

    if (search) {
      values.push(`%${search}%`);
      const idx = values.length;

      whereParts.push(`
        (
          p.name ilike $${idx}
          or coalesce(p.client_id, '') ilike $${idx}
          or coalesce(p.contact, '') ilike $${idx}
          or coalesce(c.name, '') ilike $${idx}
          or coalesce(l.name, '') ilike $${idx}
          or coalesce(t.title, '') ilike $${idx}
          or coalesce(t.note, '') ilike $${idx}
        )
      `);
    }

    if (fromDate) {
      values.push(fromDate);
      whereParts.push(`t.tx_date >= $${values.length}::date`);
    }

    if (toDate) {
      values.push(toDate);
      whereParts.push(`t.tx_date <= $${values.length}::date`);
    }

    if (locationName) {
      values.push(locationName);
      whereParts.push(`l.name = $${values.length}`);
    }

    if (modeOfPayment) {
      values.push(modeOfPayment);
      whereParts.push(`p.mode_of_payment = $${values.length}`);
    }

    const whereSql = whereParts.join(" and ");

    const countRes = await client.query<{ total: string }>(
      `
      select count(*)::text as total
      from public.warehouse_pod_transactions t
      join public.warehouse_pods p
        on p.id = t.pod_id
      left join public.companies c
        on c.id = p.company_id
      left join public.locations l
        on l.id = p.location_id
      where ${whereSql}
      `,
      values
    );

    const total = Number(countRes.rows[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const rowsRes = await client.query(
      `
      select
        t.id,
        t.pod_id,
        t.cycle_id,
        p.name as pod_name,
        p.client_id,
        c.name as company_name,
        l.name as location_name,
        p.mode_of_payment,
        t.amount::float as amount,
        t.tx_date::text as tx_date,
        t.title,
        t.note,
        t.created_at::text as created_at
      from public.warehouse_pod_transactions t
      join public.warehouse_pods p
        on p.id = t.pod_id
      left join public.companies c
        on c.id = p.company_id
      left join public.locations l
        on l.id = p.location_id
      where ${whereSql}
      order by t.tx_date desc, t.created_at desc
      limit $${values.length + 1}
      offset $${values.length + 2}
      `,
      [...values, pageSize, offset]
    );

    return NextResponse.json({
      ok: true,
      data: {
        rows: rowsRes.rows,
        meta: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
    });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));

    return NextResponse.json(
      { ok: false, error: e.message || "Failed to fetch warehouse payments" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
