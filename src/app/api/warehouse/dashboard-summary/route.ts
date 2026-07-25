import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getWarehouseDashboardSummary } from "@/lib/warehouse/summary";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const data = await getWarehouseDashboardSummary();
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.message
        : "Failed to fetch warehouse dashboard summary";

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
