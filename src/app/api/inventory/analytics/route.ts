import type { NextRequest } from "next/server";
import { requireInventoryAccess } from "@/lib/inventory/access";
import { getInventoryAnalytics } from "@/lib/inventory/analytics";
import { jsonError, jsonOk } from "@/lib/inventory/http";
import type { InventoryAnalyticsMode } from "@/lib/inventory/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireInventoryAccess(req);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "admin") return jsonError("Forbidden", 403);
  const mode = req.nextUrl.searchParams.get("mode") ?? "cy";
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  if ((mode !== "cy" && mode !== "fy") || !Number.isInteger(year) || year < 2020 || year > 2100)
    return jsonError("Enter a valid analytics period");
  try {
    return jsonOk(
      await getInventoryAnalytics(auth.branchIds, mode as InventoryAnalyticsMode, year),
    );
  } catch (error) {
    console.error("Load inventory analytics failed", error);
    return jsonError("Unable to load inventory analytics", 500);
  }
}
