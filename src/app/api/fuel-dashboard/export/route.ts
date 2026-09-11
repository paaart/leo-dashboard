import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { isISODate } from "@/lib/fuel-tracker";
import { getVehicleTrackerExportData } from "@/lib/fuel-tracker/export-data";
import { createVehicleTrackerWorkbook } from "@/lib/fuel-tracker/export-workbook";

export const runtime = "nodejs";

function optionalDate(value: string | null) {
  return value || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const vehicleId = url.searchParams.get("vehicleId");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  if (vehicleId && vehicleId !== "all" && !isUuid(vehicleId)) {
    return NextResponse.json(
      { ok: false, error: "vehicleId must be a valid UUID" },
      { status: 400 }
    );
  }
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
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return NextResponse.json(
      { ok: false, error: "From date cannot be after To date" },
      { status: 400 }
    );
  }

  const filters = {
    vehicleId: vehicleId && vehicleId !== "all" ? vehicleId : null,
    dateFrom: optionalDate(dateFrom),
    dateTo: optionalDate(dateTo),
  };

  try {
    const data = await getVehicleTrackerExportData(filters);
    const { buffer, filename } = createVehicleTrackerWorkbook(data, filters);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;

    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status }
    );
  }
}
