import type { NextRequest } from "next/server";
import { requireInventoryAccess } from "@/lib/inventory/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/inventory/http";
export const runtime = "nodejs";
const BUCKET = "inventory-invoices";
const TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export async function POST(req: NextRequest) {
  const auth = await requireInventoryAccess(req);
  if (!auth.ok) return auth.response;
  const file = (await req.formData()).get("file");
  if (
    !(file instanceof File) ||
    !TYPES.has(file.type) ||
    file.size < 1 ||
    file.size > 10 * 1024 * 1024
  )
    return jsonError("Invoice must be a PDF or image up to 10 MB");
  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (error) return jsonError("Invoice upload failed", 500);
  return jsonOk({ path }, 201);
}
export async function GET(req: NextRequest) {
  const auth = await requireInventoryAccess(req);
  if (!auth.ok) return auth.response;
  const path = req.nextUrl.searchParams.get("path");
  if (
    !path ||
    (!path.startsWith(`${auth.user.id}/`) && auth.user.role !== "admin")
  )
    return jsonError("Invalid invoice path");
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, 300);
  return error
    ? jsonError("Unable to open invoice", 500)
    : jsonOk({ signedUrl: data.signedUrl });
}
