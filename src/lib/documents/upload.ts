import { createAdminClient } from "@/lib/supabase/admin";

export const DOCUMENT_BUCKETS = {
  inventoryInvoices: "inventory-invoices",
  warehousePodDocuments: "warehouse-pod-documents",
} as const;

export type DocumentBucket = (typeof DOCUMENT_BUCKETS)[keyof typeof DOCUMENT_BUCKETS];

export type DocumentTag = {
  module: string;
  entity: string;
  entityId: string;
  documentType: string;
  ownerId: string;
};

const PDF = "application/pdf";
const ALLOWED_TYPES = new Set([PDF, "image/jpeg", "image/png", "image/webp"]);

function safePart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "unknown";
}

export function documentPath(tag: DocumentTag, file: File) {
  const extension = file.type === PDF ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
  return [safePart(tag.module), safePart(tag.entity), safePart(tag.entityId), safePart(tag.documentType), `${tag.ownerId}-${crypto.randomUUID()}.${extension}`].join("/");
}

export function validateDocument(file: unknown, pdfOnly = false) {
  if (!(file instanceof File) || (pdfOnly ? file.type !== PDF : !ALLOWED_TYPES.has(file.type)) || file.size < 1 || file.size > 10 * 1024 * 1024) {
    throw new Error(pdfOnly ? "Document must be a PDF up to 10 MB" : "Document must be a PDF or image up to 10 MB");
  }
}

export async function uploadDocument(bucket: DocumentBucket, tag: DocumentTag, file: File, pdfOnly = false) {
  validateDocument(file, pdfOnly);
  const path = documentPath(tag, file);
  const { error } = await createAdminClient().storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error("Document upload failed");
  return { path, bucket, tag };
}
