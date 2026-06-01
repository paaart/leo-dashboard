import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { getFuelDashboardSummary } from "@/lib/fuel";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getFuelDashboardSummary();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
