import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deleteLoanEntry } from "@/lib/loans";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const deleted = await deleteLoanEntry(id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Loan entry not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: deleted });
}
