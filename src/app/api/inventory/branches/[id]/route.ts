import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  cleanName,
  isPgUniqueViolation,
  isUuid,
  jsonError,
  jsonOk,
  readJsonBody,
} from "@/lib/inventory/http";
import { updateBranch, type BranchPatch } from "@/lib/inventory/setup";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return jsonError("Invalid branch id");

  const body = await readJsonBody<{
    name?: unknown;
    isActive?: unknown;
    isCentral?: unknown;
  }>(req);
  if (!body) return jsonError("Invalid JSON body");

  const patch: BranchPatch = {};

  if (body.name !== undefined) {
    const name = cleanName(body.name);
    if (!name) return jsonError("name must be a non-empty string");
    patch.name = name;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return jsonError("isActive must be a boolean");
    patch.isActive = body.isActive;
  }
  if (body.isCentral !== undefined) {
    if (typeof body.isCentral !== "boolean") return jsonError("isCentral must be a boolean");
    patch.isCentral = body.isCentral;
  }
  if (Object.keys(patch).length === 0) return jsonError("No updates provided");

  try {
    const result = await updateBranch(id, patch);
    if (!result.ok) return jsonError(result.error, result.status);
    return jsonOk(result.row);
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      return jsonError("A branch with that name already exists", 409);
    }
    return jsonError(
      err instanceof Error ? err.message : "Failed to update branch",
      500
    );
  }
}
