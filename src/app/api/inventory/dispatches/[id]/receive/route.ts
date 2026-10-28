import type { NextRequest } from "next/server";
import { requireInventoryAccess } from "@/lib/inventory/access";
import {
  isUuid,
  jsonError,
  jsonOk,
  parsePositiveInteger,
  readJsonBody,
} from "@/lib/inventory/http";
import { receiveDispatch } from "@/lib/inventory/dispatches";
export const runtime = "nodejs";
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const a = await requireInventoryAccess(req);
  if (!a.ok) return a.response;
  const { id } = await ctx.params;
  const b = await readJsonBody(req);
  const q = parsePositiveInteger(b?.quantityReceived);
  if (!isUuid(id) || q === undefined)
    return jsonError("Enter a valid received quantity");
  const row = await receiveDispatch(id, q, a.user.id, a.branchIds);
  return row
    ? jsonOk(row)
    : jsonError("Dispatch is unavailable or already received", 409);
}
