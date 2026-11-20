import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { requireInventoryAccess } from "@/lib/inventory/access";
import { DOCUMENT_BUCKETS, uploadDocument } from "@/lib/documents/upload";

export const runtime = "nodejs";

const buckets = new Set(Object.values(DOCUMENT_BUCKETS));

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const module = String(form.get("module") ?? "");
  const bucket = String(form.get("bucket") ?? "");
  const entity = String(form.get("entity") ?? "");
  const entityId = String(form.get("entityId") ?? "");
  const documentType = String(form.get("documentType") ?? "");
  const file = form.get("file");

  if (!buckets.has(bucket as typeof DOCUMENT_BUCKETS[keyof typeof DOCUMENT_BUCKETS]) || !module || !entity || !entityId || !documentType || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "module, bucket, entity, entityId, documentType, and file are required" }, { status: 400 });
  }

  const auth = module === "warehouse" ? await requireAdmin(req) : await requireInventoryAccess(req);
  if (!auth.ok) return auth.response;
  if (module === "warehouse" && bucket !== DOCUMENT_BUCKETS.warehousePodDocuments) {
    return NextResponse.json({ ok: false, error: "Invalid warehouse document bucket" }, { status: 400 });
  }
  if (module === "inventory" && bucket !== DOCUMENT_BUCKETS.inventoryInvoices) {
    return NextResponse.json({ ok: false, error: "Invalid inventory document bucket" }, { status: 400 });
  }

  try {
    const result = await uploadDocument(bucket as typeof DOCUMENT_BUCKETS[keyof typeof DOCUMENT_BUCKETS], {
      module, entity, entityId, documentType, ownerId: auth.user.id,
    }, file, module === "warehouse");
    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Document upload failed" }, { status: 400 });
  }
}
