import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { WAREHOUSE_ACTIVE_POD_BALANCE_CTES } from "@/lib/warehouse/podBalanceSql";

export type WarehousePaymentAlertRow = {
  pod_id: string;
  client_id: string | null;
  name: string;
  contact: string;
  company_name: string | null;
  location_name: string | null;
  next_payment_date: string;
  total_due: number;
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const client = await db.connect();

  try {
    const res = await client.query<WarehousePaymentAlertRow>(
      `
      with ${WAREHOUSE_ACTIVE_POD_BALANCE_CTES}
      select
        p.id::text as pod_id,
        p.client_id,
        p.name,
        p.contact,
        c.name as company_name,
        l.name as location_name,
        p.next_payment_date::date::text as next_payment_date,
        coalesce(a.total_due_gross, 0)::numeric(12,2)::float8 as total_due
      from public.warehouse_pods p
      left join public.companies c on c.id = p.company_id
      left join public.locations l on l.id = p.location_id
      left join agg a on a.pod_id = p.id
      left join public.warehouse_payment_alert_dismissals d
        on d.pod_id = p.id
       and d.next_payment_date = p.next_payment_date::date
      where p.status = 'active'::warehouse_pod_status
        and p.next_payment_date is not null
        and p.next_payment_date::date >= current_date
        and p.next_payment_date::date <= current_date + interval '5 days'
        and coalesce(a.total_due_gross, 0) > 0
        and d.id is null
      order by
        p.next_payment_date desc,
        lower(p.name) asc,
        p.client_id asc nulls last,
        p.id asc
      `
    );

    return NextResponse.json({
      ok: true,
      data: {
        rows: res.rows.map((row) => ({
          ...row,
          total_due: Number(row.total_due ?? 0),
        })),
      },
    });
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : "Failed to fetch payment alerts";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
