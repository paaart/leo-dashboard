// src/lib/inventory/access.ts
// Route guards for Inventory Management. Admins can do everything; branch
// staff can only act on the branches they are assigned to.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, type AppUser } from "@/lib/auth";
import { getAssignedBranchIds } from "./setup";

type InventoryAuthResult =
  | { ok: true; user: AppUser; branchIds: string[] | "all" }
  | { ok: false; response: NextResponse };

function forbidden() {
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}

/*
  Any admin, or a branch-staff user. `branchIds` is "all" for admins and the
  assigned (active) branches for branch staff — an unassigned branch user gets
  an empty list, not a 403, so the UI can explain rather than bounce them.
*/
export async function requireInventoryAccess(
  request: NextRequest
): Promise<InventoryAuthResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;

  if (auth.user.role === "admin") {
    return { ok: true, user: auth.user, branchIds: "all" };
  }

  if (auth.user.role === "branch") {
    const branchIds = await getAssignedBranchIds(auth.user.id);
    return { ok: true, user: auth.user, branchIds };
  }

  return { ok: false, response: forbidden() };
}

export function canAccessBranch(
  access: { branchIds: string[] | "all" },
  branchId: string
): boolean {
  return access.branchIds === "all" || access.branchIds.includes(branchId);
}
