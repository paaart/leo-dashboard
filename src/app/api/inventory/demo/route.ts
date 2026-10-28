import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteDemoInventoryData } from "@/lib/inventory/demo";
import { jsonError, jsonOk } from "@/lib/inventory/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const deleted = await deleteDemoInventoryData();
    const admin = createAdminClient();
    const { data: demoProfiles } = await admin
      .from("profiles")
      .select("auth_user_id")
      .eq("username", "test");
    const bucket = admin.storage.from("inventory-invoices");
    const paths = [...deleted.invoicePaths];
    for (const profile of demoProfiles ?? []) {
      const { data: files } = await bucket.list(profile.auth_user_id, {
        limit: 1000,
      });
      paths.push(
        ...(files ?? []).map((file) => `${profile.auth_user_id}/${file.name}`),
      );
    }
    if (paths.length) {
      await bucket.remove([...new Set(paths)]);
    }
    return jsonOk({ deleted });
  } catch (error) {
    console.error("Delete demo inventory data failed", error);
    return jsonError("Unable to delete demo inventory data", 500);
  }
}
