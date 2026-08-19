export const ACCEPTED_FUEL_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_FUEL_IMAGE_SIZE = 5 * 1024 * 1024;
export const FUEL_UPLOAD_BUCKET = "fuel-uploads";

export type FuelUploadFolder = "bills" | "meters";

export function validateFuelImage(file: File) {
  if (!ACCEPTED_FUEL_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Upload a PNG, JPEG, or WebP image.");
  }
  if (file.size > MAX_FUEL_IMAGE_SIZE) {
    throw new Error("Image must be 5 MB or smaller.");
  }
}

export function isFuelUploadFolder(value: FormDataEntryValue | null): value is FuelUploadFolder {
  return value === "bills" || value === "meters";
}
