import { BasicDetails } from "@/components/InternationalCalculator/types";
import { supabase } from "./supabaseClient";

export async function getHHGQuoteMap() {
  const { data, error } = await supabase.from("transport_quotes").select("*");

  if (error) throw new Error(error.message);

  const grouped: Record<
    string,
    { destination: string; packaging: string; transportation: string }[]
  > = {};

  data.forEach((row) => {
    if (!grouped[row.source]) {
      grouped[row.source] = [];
    }
    grouped[row.source].push({
      destination: row.destination,
      packaging: row.packaging,
      transportation: row.transportation,
    });
  });

  return grouped;
}

export async function getVehicleQuotesDict(
  source: string,
  destination: string
) {
  const { data, error } = await supabase
    .from("vehicle_quotes")
    .select("*")
    .eq("source", source)
    .eq("destination", destination);

  if (error) {
    console.error("Error fetching vehicle quotes:", error.message);
    return {};
  }

  const vehicleMap: Record<
    string,
    Record<string, Record<string, { carrier_cost: number; leo_cost: number }>>
  > = {};

  for (const row of data) {
    const source = row.source?.trim();
    const destination = row.destination?.trim();
    const size = row.size?.trim();
    if (!source || !destination || !size) continue;

    vehicleMap[source] ??= {};
    vehicleMap[source][destination] ??= {};
    vehicleMap[source][destination][size] = {
      carrier_cost: row.carrier_cost,
      leo_cost: row.leo_cost,
    };
  }

  return vehicleMap;
}

export async function getDistance(
  source: string,
  destination: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("transport_distances")
    .select("distance")
    .eq("source", source.toUpperCase().trim())
    .eq("destination", destination.toUpperCase().trim())
    .single();

  if (error) {
    console.error("Distance fetch error:", error.message);
    return null;
  }

  return data?.distance || null;
}

export async function saveInternationalQuote(values: BasicDetails) {
  const res = await fetch("/api/international/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  const result = await res.json();

  if (!res.ok) {
    console.error("❌ Error saving quote:", result.error);
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data };
}

export async function fetchInternationalQuote(): Promise<BasicDetails[]> {
  const res = await fetch("/api/international/history");

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to fetch international quotes");
  }

  const { data } = await res.json();
  return data as BasicDetails[];
}
