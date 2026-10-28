import type { NextRequest } from "next/server";
import {
  canAccessBranch,
  requireInventoryAccess,
} from "@/lib/inventory/access";
import {
  cleanOptionalText,
  isUuid,
  jsonError,
  jsonOk,
  parsePositiveInteger,
  readJsonBody,
} from "@/lib/inventory/http";
import { createDispatch, listDispatches } from "@/lib/inventory/dispatches";
import { listBranches } from "@/lib/inventory/setup";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const a = await requireInventoryAccess(req);
  if (!a.ok) return a.response;
  try {
    return jsonOk(
      await listDispatches(
        a.branchIds,
        req.nextUrl.searchParams.get("status") ?? undefined,
      ),
    );
  } catch {
    return jsonError("Unable to load dispatches", 500);
  }
}
export async function POST(req: NextRequest) {
  const a = await requireInventoryAccess(req);
  if (!a.ok) return a.response;
  if (a.user.role !== "admin")
    return jsonError("Only admins can dispatch materials", 403);
  const b = await readJsonBody(req);
  if (!b) return jsonError("Invalid JSON body");
  const q = parsePositiveInteger(b.quantitySent);
  const n = cleanOptionalText(b.notes, 1000);
  if (
    !isUuid(b.fromBranchId) ||
    !isUuid(b.toBranchId) ||
    !isUuid(b.materialId) ||
    q === undefined ||
    n === undefined ||
    b.fromBranchId === b.toBranchId
  )
    return jsonError("Enter valid dispatch details");
  if (!canAccessBranch(a, b.fromBranchId) || !canAccessBranch(a, b.toBranchId))
    return jsonError("Forbidden", 403);
  try {
    const branches = await listBranches();
    const from = branches.find((x) => x.id === b.fromBranchId);
    if (!from?.isCentral)
      return jsonError("Dispatches must start at the central store", 400);
    return jsonOk(
      {
        id: await createDispatch({
          fromBranchId: b.fromBranchId,
          toBranchId: b.toBranchId,
          materialId: b.materialId,
          quantitySent: q,
          notes: n,
          createdBy: a.user.id,
          isDemo: a.user.isDemoAccount,
        }),
      },
      201,
    );
  } catch {
    return jsonError("Unable to create dispatch", 500);
  }
}
