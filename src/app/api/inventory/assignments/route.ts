import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/inventory/http";
import { listAssignments } from "@/lib/inventory/setup";

export const runtime = "nodejs";

/* Every branch-role user with the branches they're assigned to. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    return jsonOk(await listAssignments());
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to load assignments",
      500
    );
  }
}
