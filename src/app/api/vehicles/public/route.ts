import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";

type PublicVehicleRow = {
  id: string;
  vehicle_no: string;
  vehicle_type: string;
};

export async function GET() {
  try {
    const result = await db.query<PublicVehicleRow>(
      `
      select id, vehicle_no, vehicle_type
      from public.vehicles
      where status = 'active'
      order by vehicle_no asc
      `
    );

    return NextResponse.json({
      ok: true,
      data: result.rows.map((vehicle) => ({
        id: vehicle.id,
        vehicleNo: vehicle.vehicle_no,
        vehicleType: vehicle.vehicle_type,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
