import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listWarehousePaymentAlerts } from "@/lib/warehouse/summary";

export type { WarehousePaymentAlertRow } from "@/lib/warehouse/summary";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const rows = await listWarehousePaymentAlerts();
    return NextResponse.json({ ok: true, data: { rows } });
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : "Failed to fetch payment alerts";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
