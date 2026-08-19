import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const result = await db.query(
      `
        select
          cy.pod_id,
          coalesce(p.client_id, '(missing)') as client_id,
          coalesce(p.name, '(missing)') as name,
          coalesce(p.contact, '(missing)') as contact,
          l.name as location_name,
          cy.cycle_start::text as start_date,
          cy.duration_months::int as duration_months,
          cy.cycle_end::text as end_date,
          cy.rate_at_start::float as rate,
          coalesce(cy.insurance_provider_at_start, 'none') as insurance_provider,
          coalesce(cy.insurance_value_at_start, 0)::float as insurance_value,
          coalesce(cy.insurance_idv_at_start, 0)::float as insurance_idv
        from public.warehouse_pod_cycles cy
        join public.warehouse_pods p on p.id = cy.pod_id
        left join public.locations l on l.id = p.location_id
        where cy.status = 'active'
          and date_trunc('month', cy.cycle_end) = date_trunc('month', current_date)
        order by cy.cycle_end asc, p.name asc
      `
    );
    return NextResponse.json({ ok: true, data: { rows: result.rows } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load renewals" },
      { status: 500 }
    );
  }
}
