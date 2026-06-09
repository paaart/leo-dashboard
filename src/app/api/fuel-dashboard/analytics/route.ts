import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { getFuelDashboardAnalytics, isISODate } from "@/lib/fuel";

export const runtime = "nodejs";

function optionalDate(value: string | null) {
  if (!value) return null;
  return isISODate(value) ? value : null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  if (dateFrom && !isISODate(dateFrom)) {
    return NextResponse.json(
      { ok: false, error: "dateFrom must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  if (dateTo && !isISODate(dateTo)) {
    return NextResponse.json(
      { ok: false, error: "dateTo must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  try {
    const data = await getFuelDashboardAnalytics({
      vehicleId: url.searchParams.get("vehicleId"),
      dateFrom: optionalDate(dateFrom),
      dateTo: optionalDate(dateTo),
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
