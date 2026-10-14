import type { NextRequest } from "next/server";
import {
  canAccessBranch,
  requireInventoryAccess,
} from "@/lib/inventory/access";
import { isUuid, jsonError, jsonOk, readJsonBody } from "@/lib/inventory/http";
import { listBranches, listMaterials } from "@/lib/inventory/setup";
import { CountError, listCounts, saveCounts } from "@/lib/inventory/counts";
import {
  validCountDate,
  validCountEntries,
} from "@/lib/inventory/count-validation";

export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const auth = await requireInventoryAccess(req);
    if (!auth.ok) return auth.response;
    const date = req.nextUrl.searchParams.get("date");
    if (date !== null && !validCountDate(date))
      return jsonError("Invalid count date");
    const [allBranches, materials] = await Promise.all([
      listBranches(),
      listMaterials(),
    ]);
    const branches = allBranches.filter((b) => canAccessBranch(auth, b.id));
    return jsonOk({
      isCompanyView: auth.user.role === "admin",
      branches,
      materials,
      counts: await listCounts(
        branches.map((b) => b.id),
        date ?? undefined,
      ),
    });
  } catch (error) {
    console.error("Load inventory counts failed", error);
    return jsonError("Unable to load stock counts", 500);
  }
}
export async function POST(req: NextRequest) {
  try {
    const auth = await requireInventoryAccess(req);
    if (!auth.ok) return auth.response;
    const body = await readJsonBody(req);
    if (
      !body ||
      !isUuid(body.branchId) ||
      !validCountDate(body.date) ||
      !validCountEntries(body.entries)
    ) {
      return jsonError(
        "Enter a valid date and whole, non-negative quantities for unique materials",
      );
    }
    if (!canAccessBranch(auth, body.branchId))
      return jsonError("Forbidden", 403);
    await saveCounts(body.branchId, body.date, body.entries, auth.user.id);
    return jsonOk({ saved: true });
  } catch (error) {
    if (error instanceof CountError)
      return jsonError(error.message, error.status);
    console.error("Save inventory counts failed", error);
    return jsonError("Unable to save stock counts", 500);
  }
}
