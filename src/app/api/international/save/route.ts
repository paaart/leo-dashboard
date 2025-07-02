// src/app/api/international/save/route.ts
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const values = await req.json();

  const payload = {
    customer_name: values.customerName,
    origin_city: values.originCity,
    origin_port: values.originPort,
    destination_city: values.destinationCity,
    destination_country: values.destinationCountry,
    destination_port: values.destinationPort,
    mode: values.mode,
    volume_cbm: values.volumeInCBM,
    packing_charges: parseFloat(values.packingCharges || "0"),
    handling_charges: parseFloat(values.handlingCharges || "0"),
    origin_charges_custom: parseFloat(values.originChargesCustom || "0"),
    ocean_freight: parseFloat(values.oceanFreight || "0"),
    dthc: parseFloat(values.dthc || "0"),
    destination_charges: parseFloat(values.destination || "0"),
    calculate_gst_val: values.calculateGSTVal,
  };

  const { data, error } = await supabase
    .from("international_quotes")
    .insert([payload])
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
