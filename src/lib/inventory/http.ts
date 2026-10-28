// src/lib/inventory/http.ts
// Small helpers so the inventory routes don't each re-declare the
// { ok, data | error } envelope and body parsing.
import { NextResponse, type NextRequest } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/* Returns null when the body isn't a JSON object. */
export async function readJsonBody<T extends Record<string, unknown>>(
  req: NextRequest,
): Promise<T | null> {
  try {
    const parsed: unknown = await req.json();
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

export function isPgUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

/* Whole non-negative integer, or null when blank. Undefined = invalid. */
export function parseMinStock(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return undefined;
  }
  return value;
}

/* Trimmed non-empty string, or null. */
export function cleanName(value: unknown, maxLength = 120): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

export function cleanOptionalText(
  value: unknown,
  maxLength = 500,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed || null : undefined;
}

export function parsePositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

export function parseMoney(value: unknown): number | undefined {
  if ((typeof value !== "number" && typeof value !== "string") || value === "")
    return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) &&
    parsed >= 0 &&
    Math.round(parsed * 100) === parsed * 100
    ? parsed
    : undefined;
}
