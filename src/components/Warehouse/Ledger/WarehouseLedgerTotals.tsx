"use client";

function toneClass(tone: "blue" | "green" | "red") {
  return tone === "blue"
    ? "text-blue-700 dark:text-blue-300"
    : tone === "green"
    ? "text-green-700 dark:text-green-300"
    : "text-red-700 dark:text-red-300";
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
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-[#1f2933]">
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </div>
      <div className={`mt-1 text-2xl font-bold ${toneClass(tone)}`}>
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export default function WarehouseLedgerTotals({
  currentDue,
  currentDebit,
  currentCredit,
  totalCredit,
  totalDebit,
}: {
  currentDue: string;
  currentDebit: string;
  currentCredit: string;
  totalCredit: string;
  totalDebit: string;
}) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      <Stat
        title="Current Due (as of today)"
        value={currentDue}
        tone={
          currentDue.startsWith("₹-") || currentDue === "₹0.00"
            ? "green"
            : "red"
        }
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
