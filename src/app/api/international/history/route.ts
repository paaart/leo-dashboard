// src/app/api/international/history/route.ts
import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";
import {
  BasicDetails,
  QuoteRow,
} from "@/components/InternationalCalculator/types";

export async function GET() {
  const { data, error } = await supabase
    .from("international_quotes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mappedData: BasicDetails[] = (data as QuoteRow[]).map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    originCity: row.origin_city,
    originPort: row.origin_port,
    destinationCity: row.destination_city,
    destinationCountry: row.destination_country,
    destinationPort: row.destination_port,
    mode: row.mode,
    volumeInCBM: row.volume_cbm,
    packingCharges: row.packing_charges.toString(),
    handlingCharges: row.handling_charges.toString(),
    originChargesCustom: row.origin_charges_custom.toString(),
    oceanFreight: row.ocean_freight.toString(),
    dthc: row.dthc.toString(),
    destination: row.destination_charges.toString(),
    calculateGSTVal: row.calculate_gst_val,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ data: mappedData });
}
