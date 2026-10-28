import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  cleanName,
  cleanOptionalText,
  isUuid,
  jsonError,
  jsonOk,
  readJsonBody,
} from "@/lib/inventory/http";
import { updateVendor } from "@/lib/inventory/vendors";
export const runtime = "nodejs";
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Invalid vendor id");
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");
  const name = body.name === undefined ? undefined : cleanName(body.name);
  const phone = cleanOptionalText(body.phone, 40);
  const email = cleanOptionalText(body.email, 160);
  const address = cleanOptionalText(body.address, 500);
  const notes = cleanOptionalText(body.notes, 1000);
  if (
    (body.name !== undefined && !name) ||
    phone === undefined ||
    email === undefined ||
    address === undefined ||
    notes === undefined ||
    (body.isActive !== undefined && typeof body.isActive !== "boolean")
  )
    return jsonError("Invalid vendor details");
  try {
    const row = await updateVendor(id, {
      name: name ?? undefined,
      phone,
      email,
      address,
      notes,
      isActive: body.isActive as boolean | undefined,
      isDemo: auth.user.isDemoAccount,
    });
    return row ? jsonOk(row) : jsonError("Vendor not found", 404);
  } catch {
    return jsonError("Unable to update vendor", 500);
  }
}
