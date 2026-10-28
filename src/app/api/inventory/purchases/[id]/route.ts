import type { NextRequest } from "next/server";
import { requireInventoryAccess } from "@/lib/inventory/access";
import { deletePurchase } from "@/lib/inventory/vendors";
import { isUuid, jsonError, jsonOk } from "@/lib/inventory/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireInventoryAccess(req);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "admin")
    return jsonError("Only admins can delete purchases", 403);
  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError("Invalid purchase id");
  try {
    const row = await deletePurchase(id);
    if (!row) return jsonError("Purchase not found", 404);
    if (row.invoicePath) {
      await createAdminClient()
        .storage.from("inventory-invoices")
        .remove([row.invoicePath]);
    }
    return jsonOk({ deleted: true });
  } catch {
    return jsonError("Unable to delete purchase", 500);
  }
}
