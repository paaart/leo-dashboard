import type { CountInput } from "./types";

export const OPENING_DATE = "2026-08-31";
export function inventoryToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function validCountDate(
  value: unknown,
  today = inventoryToday(),
): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value >= OPENING_DATE &&
    value <= today
  );
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validCountEntries(value: unknown): value is CountInput[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500)
    return false;
  const seen = new Set<string>();
  return value.every((entry: unknown) => {
    if (!entry || typeof entry !== "object") return false;
    const e = entry as Record<string, unknown>;
    if (
      typeof e.materialId !== "string" ||
      !uuid.test(e.materialId) ||
      seen.has(e.materialId.toLowerCase())
    )
      return false;
    seen.add(e.materialId.toLowerCase());
    return (
      typeof e.quantity === "number" &&
      Number.isInteger(e.quantity) &&
      e.quantity >= 0 &&
      e.quantity <= 2147483647 &&
      (e.version === null ||
        (typeof e.version === "number" &&
          Number.isInteger(e.version) &&
          e.version > 0 &&
          e.version < 2147483647))
    );
  });
}
