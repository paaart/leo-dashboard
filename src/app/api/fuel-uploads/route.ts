import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  FUEL_UPLOAD_BUCKET,
  isFuelUploadFolder,
  validateFuelImage,
} from "@/lib/fuel-tracker/upload-validation";

export const runtime = "nodejs";

async function upload(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const folder = form.get("folder");
  if (!(file instanceof File) || !isFuelUploadFolder(folder)) {
    return NextResponse.json({ ok: false, error: "file and a valid folder are required" }, { status: 400 });
  }

  try {
    validateFuelImage(file);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await createAdminClient().storage
      .from(FUEL_UPLOAD_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
    if (error) throw error;
    return NextResponse.json({ ok: true, data: { path } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  return upload(req);
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const path = new URL(req.url).searchParams.get("path");
  if (!path || !/^(bills|meters)\/[a-f0-9-]+\.[a-z0-9]+$/i.test(path)) {
    return NextResponse.json({ ok: false, error: "Invalid image path" }, { status: 400 });
  }
  const { data, error } = await createAdminClient().storage
    .from(FUEL_UPLOAD_BUCKET)
    .createSignedUrl(path, 5 * 60);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: { signedUrl: data.signedUrl } });
}
