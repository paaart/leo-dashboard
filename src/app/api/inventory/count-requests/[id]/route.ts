import type { NextRequest } from "next/server";
import { requireInventoryAccess } from "@/lib/inventory/access";
import { isUuid, jsonError, jsonOk } from "@/lib/inventory/http";
import { completeCountRequest } from "@/lib/inventory/dispatches";
export const runtime = "nodejs";
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const a = await requireInventoryAccess(req);
  if (!a.ok) return a.response;
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError("Invalid request id");
  const row = await completeCountRequest(id, a.branchIds, a.user.id);
  return row
    ? jsonOk(row)
    : jsonError("Request is unavailable or already complete", 409);
}
