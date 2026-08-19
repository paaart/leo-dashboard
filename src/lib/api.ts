import { BasicDetails } from "@/components/InternationalCalculator/types";

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getErrorMessageFromResponse(res: Response, parsed: unknown) {
  if (res.status === 401) return "Your session has expired. Please log in again.";
  if (res.status === 403) return "You do not have permission to access this resource.";
  if (res.status >= 500) return "Something went wrong. Please try again.";

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "error" in parsed &&
    typeof parsed.error === "string"
  ) {
    return parsed.error;
  }

  return `Request failed (${res.status})`;
}

export async function getHHGQuoteMap() {
  const res = await fetch("/api/quotes?type=hhg");
  const parsed = await parseJsonResponse(res);
  if (!res.ok) throw new Error(getErrorMessageFromResponse(res, parsed));
  const data = (
    typeof parsed === "object" && parsed !== null && "data" in parsed
      ? parsed.data
      : []
  ) as { source: string; destination: string; packaging: string; transportation: string }[];

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
  const params = new URLSearchParams({ type: "vehicle", source, destination });
  const res = await fetch(`/api/quotes?${params}`);
  const parsed = await parseJsonResponse(res);
  if (!res.ok) {
    console.error("Error fetching vehicle quotes:", getErrorMessageFromResponse(res, parsed));
    return {};
  }
  const data = (
    typeof parsed === "object" && parsed !== null && "data" in parsed
      ? parsed.data
      : []
  ) as {
    source: string;
    destination: string;
    size: string;
    carrier_cost: number;
    leo_cost: number;
  }[];

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
  const params = new URLSearchParams({ type: "distance", source, destination });
  const res = await fetch(`/api/quotes?${params}`);
  const parsed = await parseJsonResponse(res);
  if (!res.ok) {
    console.error("Distance fetch error:", getErrorMessageFromResponse(res, parsed));
    return null;
  }
  const data = typeof parsed === "object" && parsed !== null && "data" in parsed
    ? parsed.data as { distance?: number } | null
    : null;
  return data?.distance ?? null;
}

export async function saveInternationalQuote(values: BasicDetails) {
  const res = await fetch("/api/international/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  const parsed = await parseJsonResponse(res);

  if (!res.ok) {
    const error = getErrorMessageFromResponse(res, parsed);
    console.error("Error saving quote:", error);
    return { success: false, error };
  }

  const data =
    typeof parsed === "object" && parsed !== null && "data" in parsed
      ? parsed.data
      : null;

  return { success: true, data };
}

export async function fetchInternationalQuote(): Promise<BasicDetails[]> {
  const res = await fetch("/api/international/history");
  const parsed = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(getErrorMessageFromResponse(res, parsed));
  }

  const data =
    typeof parsed === "object" && parsed !== null && "data" in parsed
      ? parsed.data
      : [];

  return data as BasicDetails[];
}
