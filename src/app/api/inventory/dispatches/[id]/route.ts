import type { NextRequest } from "next/server";
import { requireInventoryAccess } from "@/lib/inventory/access";
import { deleteDispatch } from "@/lib/inventory/dispatches";
import { isUuid, jsonError, jsonOk } from "@/lib/inventory/http";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireInventoryAccess(req);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "admin")
    return jsonError("Only admins can delete dispatches", 403);
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError("Invalid dispatch id");
  try {
    const row = await deleteDispatch(id);
    return row ? jsonOk({ deleted: true }) : jsonError("Dispatch not found", 404);
  } catch {
    return jsonError("Unable to delete dispatch", 500);
  }
}
