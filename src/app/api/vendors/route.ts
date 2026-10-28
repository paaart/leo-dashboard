import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  cleanName,
  cleanOptionalText,
  isPgUniqueViolation,
  jsonError,
  jsonOk,
  readJsonBody,
} from "@/lib/inventory/http";
import { createVendor, listVendors } from "@/lib/inventory/vendors";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    return jsonOk(
      await listVendors(
        req.nextUrl.searchParams.get("includeInactive") === "1",
      ),
    );
  } catch {
    return jsonError("Unable to load vendors", 500);
  }
}
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");
  const name = cleanName(body.name);
  const phone = cleanOptionalText(body.phone, 40);
  const email = cleanOptionalText(body.email, 160);
  const address = cleanOptionalText(body.address, 500);
  const notes = cleanOptionalText(body.notes, 1000);
  if (
    !name ||
    phone === undefined ||
    email === undefined ||
    address === undefined ||
    notes === undefined
  )
    return jsonError("Enter a valid vendor name and contact details");
  try {
    return jsonOk(
      await createVendor({ name, phone, email, address, notes }),
      201,
    );
  } catch (error) {
    return isPgUniqueViolation(error)
      ? jsonError("A vendor with that name already exists", 409)
      : jsonError("Unable to create vendor", 500);
  }
}
