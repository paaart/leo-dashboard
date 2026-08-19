import { db } from "@/lib/db";

export type LoanType = "loan" | "advance" | "repayment";

export type LoanInput = {
  employeeId: string;
  amount: number;
  type: LoanType;
  remarks?: string | null;
  paymentDate: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

export function validateLoanInput(input: unknown):
  | { ok: true; value: LoanInput }
  | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Invalid loan entry" };
  }

  const body = input as Record<string, unknown>;
  const employeeId = text(body.employeeId);
  const amount = Number(body.amount);
  const type = body.type;
  const paymentDate = text(body.paymentDate);

  if (!employeeId) return { ok: false, error: "employeeId is required" };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "amount must be greater than zero" };
  }
  if (type !== "loan" && type !== "advance" && type !== "repayment") {
    return { ok: false, error: "type must be loan, advance, or repayment" };
  }
  if (!paymentDate || !ISO_DATE.test(paymentDate)) {
    return { ok: false, error: "paymentDate must be YYYY-MM-DD" };
  }

  return {
    ok: true,
    value: {
      employeeId,
      amount: type === "repayment" ? -amount : amount,
      type,
      remarks: text(body.remarks),
      paymentDate,
    },
  };
}

export async function listOutstandingLoans() {
  const result = await db.query(
    `
      select
        e.id as employee_id,
        e.name,
        e.employee_code,
        coalesce(sum(el.amount), 0)::float as total_outstanding,
        count(el.id)::int as txn_count,
        min(el.payment_date)::text as first_txn_date,
        max(el.payment_date)::text as last_txn_date
      from public.employees e
      join public.employee_loans el on el.employee_id = e.id
      group by e.id, e.name, e.employee_code
      having coalesce(sum(el.amount), 0) <> 0
      order by e.name asc
    `
  );

  return result.rows;
}

export async function loanSummary() {
  const [outstanding, totals] = await Promise.all([
    listOutstandingLoans(),
    db.query(
      `
        select
          coalesce(sum(abs(amount)) filter (where type in ('loan', 'advance')), 0)::float as total_given,
          coalesce(sum(abs(amount)) filter (where type = 'repayment'), 0)::float as total_repayments
        from public.employee_loans
      `
    ),
  ]);
  const row = totals.rows[0] ?? { total_given: 0, total_repayments: 0 };

  return {
    totalOutstanding: outstanding.reduce(
      (total, loan) => total + Number(loan.total_outstanding ?? 0),
      0
    ),
    activeEmployeesWithBalance: outstanding.length,
    totalGiven: Number(row.total_given ?? 0),
    totalRepayments: Number(row.total_repayments ?? 0),
  };
}

export async function listLoanTransactions(params: {
  employeeId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  limit?: number;
  offset?: number;
  ascending?: boolean;
}) {
  const values: unknown[] = [];
  const filters: string[] = [];
  const addFilter = (sql: string, value: unknown) => {
    values.push(value);
    filters.push(sql.replace("?", `$${values.length}`));
  };

  if (params.employeeId) addFilter("el.employee_id = ?", params.employeeId);
  if (params.fromDate) addFilter("el.payment_date >= ?", params.fromDate);
  if (params.toDate) addFilter("el.payment_date <= ?", params.toDate);

  const limit = Math.min(Math.max(params.limit ?? 500, 1), 5000);
  const offset = Math.max(params.offset ?? 0, 0);
  values.push(limit, offset);

  const result = await db.query(
    `
      select
        el.id,
        el.employee_id,
        el.amount::float as amount,
        el.type,
        el.remarks,
        el.payment_date::text as payment_date,
        el.created_at,
        e.id as employee_id_value,
        e.name as employee_name,
        e.employee_code as employee_code
      from public.employee_loans el
      join public.employees e on e.id = el.employee_id
      ${filters.length ? `where ${filters.join(" and ")}` : ""}
      order by el.payment_date ${params.ascending ? "asc" : "desc"},
               el.created_at ${params.ascending ? "asc" : "desc"}
      limit $${values.length - 1} offset $${values.length}
    `,
    values
  );

  return result.rows.map((row) => ({
    id: row.id,
    employee_id: row.employee_id,
    amount: Number(row.amount),
    type: row.type,
    remarks: row.remarks,
    payment_date: row.payment_date,
    created_at: row.created_at,
    employee: {
      id: row.employee_id_value,
      name: row.employee_name,
      employee_code: row.employee_code,
    },
  }));
}

export async function createLoanEntry(input: LoanInput) {
  const result = await db.query(
    `
      insert into public.employee_loans (employee_id, amount, type, remarks, payment_date)
      select $1, $2, $3, $4, $5
      where exists (select 1 from public.employees where id = $1 and display = true)
      returning id, employee_id, amount::float as amount, type, remarks,
                payment_date::text as payment_date, created_at
    `,
    [input.employeeId, input.amount, input.type, input.remarks, input.paymentDate]
  );

  if (!result.rows[0]) {
    const error = new Error("Employee was not found or is inactive") as Error & {
      status?: number;
    };
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

export async function deleteLoanEntry(id: string) {
  const result = await db.query(
    "delete from public.employee_loans where id = $1 returning id",
    [id]
  );
  return result.rows[0] ?? null;
}
