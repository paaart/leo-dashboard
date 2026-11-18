import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";

const BUCKET = "warehouse-pod-documents";
const KINDS = {
  packingList: "packing_list_path",
  ledgerRecord: "ledger_record_path",
  storageContract: "storage_contract_path",
} as const;

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const form = await req.formData();
  const podId = String(form.get("podId") ?? "");
  const kind = String(form.get("kind") ?? "") as keyof typeof KINDS;
  const file = form.get("file");
  if (!/^[0-9a-f-]{36}$/i.test(podId) || !(kind in KINDS)) return bad("Invalid document details");
  if (!(file instanceof File) || file.type !== "application/pdf" || file.size < 1 || file.size > 10 * 1024 * 1024) {
    return bad("Document must be a PDF up to 10 MB");
  }
  const path = `${auth.user.id}/${podId}/${kind}-${crypto.randomUUID()}.pdf`;
  const { error } = await createAdminClient().storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return bad("Document upload failed", 500);
  try {
    await db.query(`update public.warehouse_pods set ${KINDS[kind]} = $2, updated_at = now() where id = $1::uuid`, [podId, path]);
    return NextResponse.json({ ok: true, data: { path } }, { status: 201 });
  } catch {
    await createAdminClient().storage.from(BUCKET).remove([path]);
    return bad("Unable to save document", 500);
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return bad("Invalid document path");
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrl(path, 300);
  return error ? bad("Unable to open document", 500) : NextResponse.redirect(data.signedUrl);
}
