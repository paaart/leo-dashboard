// src/lib/warehouse/api.ts

export type ApiFail = { ok: false; error: string };
export type ApiOk<T> = { ok: true; data: T };
export type ApiResponse<T> = ApiOk<T> | ApiFail;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// function getString(v: unknown): string | null {
//   return typeof v === "string" ? v : null;
// }

function isApiFail(v: unknown): v is ApiFail {
  if (!isObject(v)) return false;
  return v.ok === false && typeof v.error === "string";
}

function isApiOk<T>(v: unknown): v is ApiOk<T> {
  if (!isObject(v)) return false;
  return v.ok === true && "data" in v;
}

export function handleApiAuthFailure(status: number) {
  if (status !== 401 && status !== 403) return;
  if (typeof window === "undefined") return;

  window.localStorage.removeItem("leo-dashboard-auth-user");

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

export async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);

  const text = await res.text();

  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // non-JSON response (like Next's HTML 500 page)
      parsed = null;
    }
  } else {
    parsed = null;
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      handleApiAuthFailure(res.status);
      throw new Error(
        res.status === 401
          ? "Your session has expired. Please log in again."
          : "You do not have permission to access this resource."
      );
    }

    if (res.status >= 500) {
      throw new Error("Something went wrong. Please try again.");
    }

    if (isApiFail(parsed)) throw new Error(parsed.error);

    // If server returned non-JSON (HTML), show that
    if (typeof text === "string" && text.trim()) {
      throw new Error(`Request failed (${res.status}): ${text.slice(0, 200)}`);
    }

    throw new Error(`Request failed (${res.status})`);
  }

  if (isApiFail(parsed)) throw new Error(parsed.error);
  if (!isApiOk<T>(parsed)) throw new Error("Invalid API response shape");

  return parsed.data;
}
