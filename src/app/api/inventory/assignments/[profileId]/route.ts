import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isUuid, jsonError, jsonOk, readJsonBody } from "@/lib/inventory/http";
import { setAssignments } from "@/lib/inventory/setup";

export const runtime = "nodejs";

/* Replaces the user's whole branch list. An empty array unassigns them. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { profileId } = await params;
  if (!isUuid(profileId)) return jsonError("Invalid user id");

  const body = await readJsonBody<{ branchIds?: unknown }>(req);
  if (!body) return jsonError("Invalid JSON body");

  if (!Array.isArray(body.branchIds) || !body.branchIds.every(isUuid)) {
    return jsonError("branchIds must be an array of branch ids");
  }
  const branchIds = Array.from(new Set(body.branchIds));

  try {
    const result = await setAssignments(profileId, branchIds);
    if (!result.ok) return jsonError(result.error, result.status);
    return jsonOk(result.row);
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to update assignments",
      500
    );
  }
}
