import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";

function route(value: string | null) {
  return value?.trim() ?? "";
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  try {
    if (type === "hhg") {
      const result = await db.query(
        "select source, destination, packaging, transportation from public.transport_quotes"
      );
      return NextResponse.json({ ok: true, data: result.rows });
    }

    const source = route(url.searchParams.get("source"));
    const destination = route(url.searchParams.get("destination"));
    if (!source || !destination) {
      return NextResponse.json(
        { ok: false, error: "source and destination are required" },
        { status: 400 }
      );
    }

    if (type === "vehicle") {
      const result = await db.query(
        `
          select source, destination, size, carrier_cost::float as carrier_cost,
                 leo_cost::float as leo_cost
          from public.vehicle_quotes
          where source = $1 and destination = $2
        `,
        [source, destination]
      );
      return NextResponse.json({ ok: true, data: result.rows });
    }

    if (type === "distance") {
      const result = await db.query(
        `
          select distance::float as distance
          from public.transport_distances
          where source = $1 and destination = $2
          limit 1
        `,
        [source.toUpperCase(), destination.toUpperCase()]
      );
      return NextResponse.json({ ok: true, data: result.rows[0] ?? null });
    }

    return NextResponse.json({ ok: false, error: "Unknown quote type" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
