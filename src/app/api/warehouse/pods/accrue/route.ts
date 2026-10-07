import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { accrueWarehousePods } from "@/lib/warehouse/accrual";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const podIdRaw = searchParams.get("podId");
  const podId = podIdRaw && podIdRaw.trim() ? podIdRaw.trim() : null;

  if (!podId) {
    return NextResponse.json(
      { ok: false, error: "Pass podId for single-pod accrual." },
      { status: 400 },
    );
  }

  try {
    await accrueWarehousePods({ podId, batchSize: 1 });
    return NextResponse.json({ ok: true, data: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to accrue charges";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
