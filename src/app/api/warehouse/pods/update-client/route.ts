import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  let body: {
    podId?: string;
    name?: string;
    email?: string | null;
    contact?: string;
    locationName?: string;
    rate?: number;
    durationMonths?: number;
    billingInterval?: "monthly" | "quarterly" | "half_yearly" | "yearly";
    modeOfPayment?: string | null;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("Invalid JSON body");
  }

  const podId = String(body.podId ?? "").trim();
  const name = String(body.name ?? "").trim();
  const email =
    body.email == null || String(body.email).trim() === ""
      ? null
      : String(body.email).trim();
  const contact = String(body.contact ?? "").trim();
  const hasLocationName = typeof body.locationName === "string";
  const locationName = hasLocationName ? body.locationName!.trim() : null;
  const rate = body.rate === undefined ? null : Number(body.rate);
  const durationMonths =
    body.durationMonths === undefined ? null : Number(body.durationMonths);
  const billingInterval = body.billingInterval;
  const modeOfPayment =
    body.modeOfPayment === undefined
      ? undefined
      : String(body.modeOfPayment ?? "").trim() || null;

  if (!podId) return bad("podId is required");
  if (!name) return bad("name is required");
  if (!contact) return bad("contact is required");
  if (rate !== null && (!Number.isFinite(rate) || rate <= 0)) {
    return bad("rate must be greater than zero");
  }
  if (
    durationMonths !== null &&
    (!Number.isInteger(durationMonths) || durationMonths < 1)
  ) {
    return bad("durationMonths must be a positive integer");
  }
  if (
    billingInterval !== undefined &&
    !["monthly", "quarterly", "half_yearly", "yearly"].includes(billingInterval)
  ) {
    return bad("Invalid billingInterval");
  }

  const client = await db.connect();

  try {
    let locationId: number | null = null;
    if (hasLocationName && locationName) {
      const location = await client.query<{ id: number }>(
        `
          select id from public.locations
          where lower(name) = lower($1) and is_active = true
          limit 1
        `,
        [locationName]
      );
      if (location.rowCount === 0) return bad("Selected location was not found");
      locationId = location.rows[0].id;
    }

    const res = await client.query(
      `
      update public.warehouse_pods
      set
        name = $2::text,
        email = $3::text,
        contact = $4::text,
        rate = coalesce($5::numeric, rate),
        duration_months = coalesce($6::int, duration_months),
        billing_interval = coalesce($7::warehouse_billing_interval, billing_interval),
        mode_of_payment = case when $8::boolean then $9::text else mode_of_payment end,
        location_id = case when $10::boolean then $11::int else location_id end,
        updated_at = now()
      where id = $1::uuid
      returning
        id,
        name,
        email,
        contact,
        rate::float as rate,
        duration_months,
        billing_interval::text as billing_interval,
        mode_of_payment,
        location_id,
        updated_at::text as updated_at
      `,
      [
        podId,
        name,
        email,
        contact,
        rate,
        durationMonths,
        billingInterval ?? null,
        body.modeOfPayment !== undefined,
        modeOfPayment ?? null,
        hasLocationName,
        locationId,
      ]
    );

    if (res.rowCount === 0) {
      return bad("Pod not found", 404);
    }

    return NextResponse.json({
      ok: true,
      data: res.rows[0],
    });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to update client" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
