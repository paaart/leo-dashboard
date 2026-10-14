import type { NextRequest } from "next/server";
import {
  canAccessBranch,
  requireInventoryAccess,
} from "@/lib/inventory/access";
import { isUuid, jsonError, jsonOk } from "@/lib/inventory/http";
import { countHistory } from "@/lib/inventory/counts";
import { listBranches } from "@/lib/inventory/setup";

export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const auth = await requireInventoryAccess(req);
    if (!auth.ok) return auth.response;
    const params = req.nextUrl.searchParams;
    const materialId = params.get("materialId");
    const branchId = params.get("branchId");
    const offset = Number(params.get("offset") ?? 0);
    if (
      !isUuid(materialId) ||
      (branchId !== null && !isUuid(branchId)) ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 1000000
    )
      return jsonError("Invalid history filters");
    if (branchId && !canAccessBranch(auth, branchId))
      return jsonError("Forbidden", 403);
    const branches = (await listBranches()).filter(
      (b) => canAccessBranch(auth, b.id) && (!branchId || b.id === branchId),
    );
    return jsonOk(
      await countHistory(
        branches.map((b) => b.id),
        materialId,
        offset,
      ),
    );
  } catch (error) {
    console.error("Load count history failed", error);
    return jsonError("Unable to load count history", 500);
  }
}
