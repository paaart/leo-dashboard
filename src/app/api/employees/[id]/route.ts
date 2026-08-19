import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { getEmployee, updateEmployeeAssignment, validateEmployeeInput } from "@/lib/employees";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const data = await getEmployee(id);
    if (!data) return NextResponse.json({ ok: false, error: "Employee not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const validation = validateEmployeeInput({
    name: "update",
    employeeCode: "UPDATE",
    companyId: body?.companyId,
    locationId: body?.locationId,
  });
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const { id } = await context.params;
  try {
    const data = await updateEmployeeAssignment(id, validation.value);
    if (!data) return NextResponse.json({ ok: false, error: "Employee not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
