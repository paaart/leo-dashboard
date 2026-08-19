import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  createLoanEntry,
  listLoanTransactions,
  listOutstandingLoans,
  loanSummary,
  validateLoanInput,
} from "@/lib/loans";

export const runtime = "nodejs";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function validDate(value: string | null) {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "transactions";
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");
  if (!validDate(fromDate) || !validDate(toDate)) {
    return jsonError("Dates must be YYYY-MM-DD");
  }

  try {
    if (view === "summary") return NextResponse.json({ ok: true, data: await loanSummary() });
    if (view === "outstanding") {
      return NextResponse.json({ ok: true, data: await listOutstandingLoans() });
    }
    if (view !== "transactions") return jsonError("Unknown loan view");

    const data = await listLoanTransactions({
      employeeId: url.searchParams.get("employeeId"),
      fromDate,
      toDate,
      limit: Number(url.searchParams.get("limit") ?? 500),
      offset: Number(url.searchParams.get("offset") ?? 0),
      ascending: url.searchParams.get("order") === "asc",
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return jsonError(getErrorMessage(error), 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const validation = validateLoanInput(await req.json().catch(() => null));
  if (!validation.ok) return jsonError(validation.error);

  try {
    return NextResponse.json(
      { ok: true, data: await createLoanEntry(validation.value) },
      { status: 201 }
    );
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? Number(error.status) : 500;
    return jsonError(getErrorMessage(error), status);
  }
}
