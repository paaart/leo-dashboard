import { supabase } from "@/lib/supabaseClient";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const BUCKET = "fuel-uploads";

type FuelUploadFolder = "bills" | "meters";

export function validateFuelImage(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Upload a PNG, JPEG, or WebP image.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image must be 5 MB or smaller.");
  }
}

export async function uploadFuelImage(
  file: File,
  folder: FuelUploadFolder
): Promise<string> {
  validateFuelImage(file);

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(error.message);

  return path;
}

export async function createFuelImageSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 5 * 60);

  if (error) throw new Error(error.message);

  return data.signedUrl;
}
