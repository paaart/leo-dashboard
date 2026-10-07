import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { accrueWarehousePods } from "@/lib/warehouse/accrual";

const DEFAULT_BATCH_SIZE = 200;

function isAuthorizedCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(
    cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`,
  );
}

async function handleAccrual(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  const { searchParams } = new URL(req.url);
  const requestedBatchSize = Number(
    searchParams.get("batchSize") ?? DEFAULT_BATCH_SIZE,
  );

  try {
    const data = await accrueWarehousePods({ batchSize: requestedBatchSize });
    return NextResponse.json({
      ok: true,
      data: {
        ...data,
        message:
          data.requested === 0
            ? "No pods due for accrual"
            : `Updated ${data.podsUpdated} due pod(s)`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to accrue due pods";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleAccrual(req);
}

export async function POST(req: NextRequest) {
  return handleAccrual(req);
}
