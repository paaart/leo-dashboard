import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  cleanName,
  isPgUniqueViolation,
  isUuid,
  jsonError,
  jsonOk,
  parseMinStock,
  readJsonBody,
} from "@/lib/inventory/http";
import { updateMaterial, type MaterialPatch } from "@/lib/inventory/setup";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return jsonError("Invalid material id");

  const body = await readJsonBody<{
    name?: unknown;
    unit?: unknown;
    minStock?: unknown;
    isActive?: unknown;
  }>(req);
  if (!body) return jsonError("Invalid JSON body");

  const patch: MaterialPatch = {};

  if (body.name !== undefined) {
    const name = cleanName(body.name);
    if (!name) return jsonError("name must be a non-empty string");
    patch.name = name;
  }
  if (body.unit !== undefined) {
    const unit = cleanName(body.unit, 20);
    if (!unit) return jsonError("unit must be a non-empty string");
    patch.unit = unit;
  }
  if (body.minStock !== undefined) {
    const minStock = parseMinStock(body.minStock);
    if (minStock === undefined) {
      return jsonError("minStock must be a whole number of 0 or more");
    }
    patch.minStock = minStock;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return jsonError("isActive must be a boolean");
    patch.isActive = body.isActive;
  }
  if (Object.keys(patch).length === 0) return jsonError("No updates provided");

  try {
    const row = await updateMaterial(id, patch);
    if (!row) return jsonError("Material not found", 404);
    return jsonOk(row);
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      return jsonError("A material with that name already exists", 409);
    }
    return jsonError(
      err instanceof Error ? err.message : "Failed to update material",
      500
    );
  }
}
