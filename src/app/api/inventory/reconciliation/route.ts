import type { NextRequest } from "next/server";
import { requireInventoryAccess } from "@/lib/inventory/access";
import { isUuid, jsonError, jsonOk } from "@/lib/inventory/http";
import { reconciliation } from "@/lib/inventory/dispatches";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const a = await requireInventoryAccess(req);
  if (!a.ok) return a.response;
  const month = req.nextUrl.searchParams.get("month");
  const materialId = req.nextUrl.searchParams.get("materialId") ?? undefined;
  if (
    !month ||
    !/^[0-9]{4}-[0-9]{2}$/.test(month) ||
    (materialId && !isUuid(materialId))
  )
    return jsonError("Enter a valid month");
  try {
    return jsonOk(await reconciliation(`${month}-01`, a.branchIds, materialId));
  } catch {
    return jsonError("Unable to load reconciliation", 500);
  }
}
