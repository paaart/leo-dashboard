// lib/api/saveInternationalQuote.ts
import { supabase } from "@/lib/supabaseClient";
import { BasicDetails } from "@/components/InternationalCalculator/types";

export async function saveInternationalQuote(values: BasicDetails) {
  // Convert camelCase to snake_case
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
    console.error("❌ Error saving quote:", error);
    return { success: false, error };
  }

  return { success: true, data };
}
