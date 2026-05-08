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

  const client = await db.connect();

  try {
    const whereParts = [`p.status = 'closed'::warehouse_pod_status`];
    const values: Array<string | number> = [];

    if (search) {
      values.push(`%${search}%`);
      const idx = values.length;

      whereParts.push(`
        (
          p.name ilike $${idx}
          or coalesce(p.client_id, '') ilike $${idx}
          or coalesce(p.contact, '') ilike $${idx}
          or coalesce(p.email, '') ilike $${idx}
          or coalesce(c.name, '') ilike $${idx}
          or coalesce(l.name, '') ilike $${idx}
        )
      `);
    }

    const whereSql = whereParts.join(" and ");

    const countRes = await client.query<{ total: string }>(
      `
      select count(*)::text as total
      from public.warehouse_pods p
      left join public.companies c on c.id = p.company_id
      left join public.locations l on l.id = p.location_id
      where ${whereSql}
      `,
      values
    );

    const total = Number(countRes.rows[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const rowsRes = await client.query(
      `
      with ledger_totals as (
        select
          t.pod_id,
          coalesce(
            sum(
              case
                when t.amount > 0
                  then t.amount * (1 + (coalesce(t.gst_rate, 0) / 100.0))
                else t.amount
              end
            ),
            0
          )::numeric(12,2) as final_due
        from public.warehouse_pod_transactions t
        group by t.pod_id
      )
      select
        p.id,
        p.client_id,
        p.name,
        p.email,
        p.contact,
        c.name as company_name,
        l.name as location_name,
        p.mode_of_payment,
        p.rate::float as rate,
        p.billing_interval::text as billing_interval,
        p.start_date::text as start_date,
        p.billing_start_date::text as billing_start_date,
        p.updated_at::text as closed_at,
        coalesce(lt.final_due, 0)::float as final_due
      from public.warehouse_pods p
      left join public.companies c on c.id = p.company_id
      left join public.locations l on l.id = p.location_id
      left join ledger_totals lt on lt.pod_id = p.id
      where ${whereSql}
      order by p.updated_at desc, p.created_at desc
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
      {
        ok: false,
        error: e.message || "Failed to fetch closed warehouse pods",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
