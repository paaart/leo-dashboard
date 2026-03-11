import type { WarehouseTxn } from "@/lib/warehouse/types";

export type MonthKey = string; // YYYY-MM-01

export type LedgerTxVM = WarehouseTxn & {
  _amountSigned: number;
  _amountAbs: number;
  _isDebit: boolean;
  _isCredit: boolean;
  _gstRate: number;
  _gstAmount: number;
  _debitTotal: number;
  _creditAmount: number;
};

export type LedgerMonthGroup = {
  monthKey: MonthKey;
  rows: LedgerTxVM[];
};

export type LedgerMonthTotals = {
  debit: number;
  credit: number;
  net: number;
};

export type LedgerTotals = {
  totalDebit: number;
  totalCredit: number;
  currentDebit: number;
  currentCredit: number;
  currentDue: number;
};

export type CycleTotals = {
  incurred: number;
  paid: number;
  outstanding: number;
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function fmtINR(n: number): string {
  return `₹${round2(n).toFixed(2)}`;
}

export function fmtDate(d?: string | null): string {
  if (!d) return "—";

  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";

  return dt.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function monthLabel(monthKey: MonthKey): string {
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, 1);

  return dt.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function toMonthKeyFromISODate(isoDate: string): MonthKey {
  return `${isoDate.slice(0, 7)}-01`;
}

export function clampNumberString(s: string): string {
  if (s.trim() === "") return "";

  const cleaned = s.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");

  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

export function sortTxAsc(a: WarehouseTxn, b: WarehouseTxn): number {
  const d = a.tx_date.localeCompare(b.tx_date);
  if (d !== 0) return d;

  const ca = String(a.created_at ?? "");
  const cb = String(b.created_at ?? "");
  return ca.localeCompare(cb);
}

export function sortTxDesc(a: WarehouseTxn, b: WarehouseTxn): number {
  return sortTxAsc(b, a);
}

export function toLedgerTxVM(t: WarehouseTxn): LedgerTxVM {
  const amountSigned = Number(t.amount) || 0;
  const isDebit = amountSigned > 0;
  const isCredit = amountSigned < 0;

  const amountAbs = round2(Math.abs(amountSigned));
  const gstRate = isDebit ? round2(Number(t.gst_rate ?? 0) || 0) : 0;
  const gstAmount = isDebit ? round2(amountAbs * (gstRate / 100)) : 0;
  const debitTotal = isDebit ? round2(amountAbs + gstAmount) : 0;
  const creditAmount = isCredit ? amountAbs : 0;

  return {
    ...t,
    _amountSigned: round2(amountSigned),
    _amountAbs: amountAbs,
    _isDebit: isDebit,
    _isCredit: isCredit,
    _gstRate: gstRate,
    _gstAmount: gstAmount,
    _debitTotal: debitTotal,
    _creditAmount: creditAmount,
  };
}

export function toLedgerVMRows(rows: WarehouseTxn[]): LedgerTxVM[] {
  return rows.map(toLedgerTxVM);
}

export function groupLedgerRowsByMonth(rows: LedgerTxVM[]): LedgerMonthGroup[] {
  const map = new Map<MonthKey, LedgerTxVM[]>();

  for (const row of rows) {
    const key = toMonthKeyFromISODate(row.tx_date);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  for (const [, list] of map) {
    list.sort(sortTxAsc);
  }

  const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));

  return keys.map((monthKey) => ({
    monthKey,
    rows: map.get(monthKey) ?? [],
  }));
}

export function computeMonthTotals(rows: LedgerTxVM[]): LedgerMonthTotals {
  const debit = round2(
    rows.reduce((sum, r) => sum + (r._isDebit ? r._debitTotal : 0), 0)
  );

  const credit = round2(
    rows.reduce((sum, r) => sum + (r._isCredit ? r._creditAmount : 0), 0)
  );

  return {
    debit,
    credit,
    net: round2(debit - credit),
  };
}

export function computeLedgerTotals(
  rows: LedgerTxVM[],
  asOfDate?: string
): LedgerTotals {
  const todayKey = asOfDate ?? new Date().toISOString().slice(0, 10);

  let totalDebit = 0;
  let totalCredit = 0;
  let currentDebit = 0;
  let currentCredit = 0;

  for (const r of rows) {
    if (r._isDebit) totalDebit += r._debitTotal;
    if (r._isCredit) totalCredit += r._creditAmount;

    if (r.tx_date <= todayKey) {
      if (r._isDebit) currentDebit += r._debitTotal;
      if (r._isCredit) currentCredit += r._creditAmount;
    }
  }

  totalDebit = round2(totalDebit);
  totalCredit = round2(totalCredit);
  currentDebit = round2(currentDebit);
  currentCredit = round2(currentCredit);

  return {
    totalDebit,
    totalCredit,
    currentDebit,
    currentCredit,
    currentDue: round2(currentDebit - currentCredit),
  };
}

export function computeCycleTotals(rows: WarehouseTxn[]): CycleTotals {
  const vmRows = toLedgerVMRows(rows);

  const incurred = round2(
    vmRows.reduce((sum, r) => sum + (r._isDebit ? r._debitTotal : 0), 0)
  );

  const paid = round2(
    vmRows.reduce((sum, r) => sum + (r._isCredit ? r._creditAmount : 0), 0)
  );

  return {
    incurred,
    paid,
    outstanding: round2(incurred - paid),
  };
}

export function buildEditDraft(row: WarehouseTxn) {
  const vm = toLedgerTxVM(row);

  return {
    amount: vm._amountAbs ? String(vm._amountAbs) : "",
    gst_rate: vm._isDebit ? String(vm._gstRate) : "0",
    title: String(row.title ?? "Transaction"),
    note: String(row.note ?? ""),
    tx_date: row.tx_date,
  };
}

export function buildEditDraftMap(rows: WarehouseTxn[]) {
  const out: Record<
    string,
    {
      amount: string;
      gst_rate: string;
      title: string;
      note: string;
      tx_date: string;
    }
  > = {};

  for (const row of rows) {
    out[row.id] = buildEditDraft(row);
  }

  return out;
}
