import {
  type FuelUploadFolder,
  validateFuelImage,
} from "./upload-validation";

export async function uploadFuelImage(
  file: File,
  folder: FuelUploadFolder,
  options?: { public?: boolean }
): Promise<string> {
  validateFuelImage(file);
  const form = new FormData();
  form.set("file", file);
  form.set("folder", folder);
  const response = await fetch(
    options?.public ? "/api/fuel-uploads/public" : "/api/fuel-uploads",
    { method: "POST", body: form }
  );
  const json = (await response.json()) as
    | { ok: true; data: { path: string } }
    | { ok: false; error: string };
  if (!response.ok || !json.ok) throw new Error(json.ok ? "Upload failed" : json.error);
  return json.data.path;
}

export async function createFuelImageSignedUrl(path: string): Promise<string> {
  const response = await fetch(`/api/fuel-uploads?path=${encodeURIComponent(path)}`);
  const json = (await response.json()) as
    | { ok: true; data: { signedUrl: string } }
    | { ok: false; error: string };
  if (!response.ok || !json.ok) throw new Error(json.ok ? "Unable to open image" : json.error);
  return json.data.signedUrl;
}
