import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  cleanName,
  isPgUniqueViolation,
  jsonError,
  jsonOk,
  readJsonBody,
} from "@/lib/inventory/http";
import { createBranch, listBranches } from "@/lib/inventory/setup";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const includeInactive =
    req.nextUrl.searchParams.get("includeInactive") === "1";

  try {
    return jsonOk(await listBranches({ includeInactive }));
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load branches",
      500
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody<{ name?: unknown }>(req);
  if (!body) return jsonError("Invalid JSON body");

  const name = cleanName(body.name);
  if (!name) return jsonError("name is required");

  try {
    return jsonOk(await createBranch(name), 201);
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      return jsonError("A branch with that name already exists", 409);
    }
    return jsonError(
      err instanceof Error ? err.message : "Failed to create branch",
      500
    );
  }
}
