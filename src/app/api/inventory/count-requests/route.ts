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
  readJsonBody,
} from "@/lib/inventory/http";
import {
  createCountRequest,
  listCountRequests,
} from "@/lib/inventory/dispatches";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const a = await requireInventoryAccess(req);
  if (!a.ok) return a.response;
  try {
    return jsonOk(
      await listCountRequests(
        a.branchIds,
        req.nextUrl.searchParams.get("pending") === "1",
      ),
    );
  } catch {
    return jsonError("Unable to load count requests", 500);
  }
}
export async function POST(req: NextRequest) {
  const a = await requireInventoryAccess(req);
  if (!a.ok) return a.response;
  if (a.user.role !== "admin")
    return jsonError("Only admins can request counts", 403);
  const b = await readJsonBody(req);
  const note = cleanOptionalText(b?.note, 1000);
  const due =
    b?.dueDate === null || b?.dueDate === undefined ? null : b.dueDate;
  if (
    !b ||
    !isUuid(b.branchId) ||
    note === undefined ||
    (due !== null && typeof due !== "string")
  )
    return jsonError("Enter valid request details");
  if (!canAccessBranch(a, b.branchId)) return jsonError("Forbidden", 403);
  try {
    return jsonOk(
      { id: await createCountRequest(b.branchId, due, note, a.user.id) },
      201,
    );
  } catch {
    return jsonError("Unable to create count request", 500);
  }
}
