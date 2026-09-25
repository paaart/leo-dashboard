import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  cleanName,
  isPgUniqueViolation,
  jsonError,
  jsonOk,
  parseMinStock,
  readJsonBody,
} from "@/lib/inventory/http";
import { createMaterial, listMaterials } from "@/lib/inventory/setup";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const includeInactive =
    req.nextUrl.searchParams.get("includeInactive") === "1";

  try {
    return jsonOk(await listMaterials({ includeInactive }));
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load materials",
      500
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody<{
    name?: unknown;
    unit?: unknown;
    minStock?: unknown;
  }>(req);
  if (!body) return jsonError("Invalid JSON body");

  const name = cleanName(body.name);
  if (!name) return jsonError("name is required");

  const unit = body.unit === undefined ? "pcs" : cleanName(body.unit, 20);
  if (!unit) return jsonError("unit must be a non-empty string");

  const minStock = parseMinStock(body.minStock);
  if (minStock === undefined) {
    return jsonError("minStock must be a whole number of 0 or more");
  }

  try {
    return jsonOk(await createMaterial({ name, unit, minStock }), 201);
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      return jsonError("A material with that name already exists", 409);
    }
    return jsonError(
      err instanceof Error ? err.message : "Failed to create material",
      500
    );
  }
}
