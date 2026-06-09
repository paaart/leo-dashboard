import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

function isISODate(value: string | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(csvCell).join(",");
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!isISODate(startDate) || !isISODate(endDate)) {
    return NextResponse.json(
      {
        ok: false,
        error: "startDate and endDate are required in YYYY-MM-DD format",
      },
      { status: 400 }
    );
  }

  const checkedStartDate = startDate;
  const checkedEndDate = endDate;

  if (checkedStartDate > checkedEndDate) {
    return NextResponse.json(
      { ok: false, error: "startDate must be before or equal to endDate" },
      { status: 400 }
    );
  }

  const client = await db.connect();

  try {
    const rowsRes = await client.query<{
      payment_date: string | null;
      client_name: string | null;
      storage_reference: string | null;
      amount: number;
      payment_mode: string | null;
      transaction_type: string;
      remarks: string | null;
      created_at: string | null;
    }>(
      `
      select
        t.tx_date::text as payment_date,
        coalesce(p.name, c.name) as client_name,
        nullif(concat_ws(' / ', p.client_id, l.name), '') as storage_reference,
        abs(t.amount)::float as amount,
        p.mode_of_payment as payment_mode,
        t.type::text as transaction_type,
        coalesce(nullif(t.note, ''), t.title) as remarks,
        t.created_at::text as created_at
      from public.warehouse_pod_transactions t
      join public.warehouse_pods p
        on p.id = t.pod_id
      left join public.companies c
        on c.id = p.company_id
      left join public.locations l
        on l.id = p.location_id
      where t.type = 'payment'::warehouse_tx_type
        and t.tx_date >= $1::date
        and t.tx_date <= $2::date
      order by t.tx_date desc, t.created_at desc
      `,
      [checkedStartDate, checkedEndDate]
    );

    const headers = [
      "Payment Date",
      "Client Name",
      "POD Number / Storage Reference",
      "Amount",
      "Payment Mode",
      "Transaction Type",
      "Remarks",
      "Created At",
    ];

    const csv = [
      csvRow(headers),
      ...rowsRes.rows.map((row) =>
        csvRow([
          row.payment_date,
          row.client_name,
          row.storage_reference,
          Number(row.amount || 0).toFixed(2),
          row.payment_mode,
          row.transaction_type,
          row.remarks,
          row.created_at,
        ])
      ),
    ].join("\n");

    const fileName = `warehouse-payments-${checkedStartDate}-to-${checkedEndDate}.csv`;

    return new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));

    return NextResponse.json(
      { ok: false, error: e.message || "Failed to export warehouse payments" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
