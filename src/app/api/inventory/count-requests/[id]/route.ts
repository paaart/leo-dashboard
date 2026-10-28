import type { NextRequest } from "next/server";
import { requireInventoryAccess } from "@/lib/inventory/access";
import { isUuid, jsonError, jsonOk } from "@/lib/inventory/http";
import {
  completeCountRequest,
  deleteCountRequest,
} from "@/lib/inventory/dispatches";
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

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const a = await requireInventoryAccess(req);
  if (!a.ok) return a.response;
  if (a.user.role !== "admin")
    return jsonError("Only admins can delete count requests", 403);
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError("Invalid request id");
  const row = await deleteCountRequest(id);
  return row ? jsonOk({ deleted: true }) : jsonError("Request not found", 404);
}
