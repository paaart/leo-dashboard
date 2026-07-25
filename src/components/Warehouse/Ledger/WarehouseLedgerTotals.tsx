"use client";

function toneClass(tone: "blue" | "green" | "red") {
  return tone === "blue"
    ? "text-accent"
    : tone === "green"
    ? "text-success"
    : "text-danger";
}

function Stat({
  title,
  value,
  tone,
  sub,
}: {
  title: string;
  value: string;
  tone: "blue" | "green" | "red";
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-4 shadow-card">
      <div className="text-xs uppercase tracking-wide text-fg-muted">
        {title}
      </div>

      <div className={`mt-1 text-2xl font-bold ${toneClass(tone)}`}>
        {value}
      </div>

      {sub && (
        <div className="mt-1 text-xs text-fg-muted">
          {sub}
        </div>
      )}
    </div>
  );
}

export default function WarehouseLedgerTotals({
  currentDue,
  currentDueNumber,
  currentDebit,
  currentCredit,
  totalCredit,
  totalDebit,
}: {
  currentDue: string;
  currentDueNumber: number;
  currentDebit: string;
  currentCredit: string;
  totalCredit: string;
  totalDebit: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Stat
        title="Current Due (as of today)"
        value={currentDue}
        tone={currentDueNumber <= 0 ? "green" : "red"}
        sub={`Debit ${currentDebit} • Credit ${currentCredit}`}
      />

      <Stat
        title="Total Credit"
        value={totalCredit}
        tone="green"
        sub="(Payments received)"
      />

      <Stat
        title="Total Debit"
        value={totalDebit}
        tone="blue"
        sub="(Amount + GST)"
      />
    </div>
  );
}
