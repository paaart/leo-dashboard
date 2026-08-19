import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  createEmployee,
  listEmployeeReferences,
  listEmployees,
  validateEmployeeInput,
} from "@/lib/employees";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const [employees, references] = await Promise.all([
      listEmployees(),
      listEmployeeReferences(),
    ]);
    return NextResponse.json({ ok: true, data: { employees, ...references } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const validation = validateEmployeeInput(await req.json().catch(() => null));
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }
  try {
    const data = await createEmployee(validation.value);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("employee_code") ? 409 : 500;
    return NextResponse.json(
      { ok: false, error: status === 409 ? "Employee code already exists" : message },
      { status }
    );
  }
}
