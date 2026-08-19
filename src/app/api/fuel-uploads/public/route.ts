import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  FUEL_UPLOAD_BUCKET,
  isFuelUploadFolder,
  validateFuelImage,
} from "@/lib/fuel-tracker/upload-validation";

export const runtime = "nodejs";

// The driver fuel-entry form is intentionally public. Keep this endpoint narrow:
// only a single validated image can be uploaded into the two fuel folders.
export async function POST(req: NextRequest) {
  const form = await req.formData();
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
