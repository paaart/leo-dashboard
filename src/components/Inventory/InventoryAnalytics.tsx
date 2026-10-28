"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { PageHeader, SegmentedTabs } from "@/components/shared/DashboardUI";
import {
  alertDanger,
  alertInfo,
  badgeClass,
  buttonPrimary,
  buttonSecondary,
  cardPadded,
  selectField,
  tableBase,
  tableCell,
  tableHead,
  tableHeadCell,
  tableRow,
  tableWrapper,
} from "@/components/shared/ui";
import { loadInventoryAnalytics } from "@/lib/inventory/dispatch-client";
import type { InventoryAnalyticsResponse } from "@/lib/inventory/types";

const currentYear = new Date().getFullYear();

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function quantity(value: number) {
  return value.toLocaleString("en-IN");
}

export default function InventoryAnalytics() {
  const [mode, setMode] = useState<"cy" | "fy">("cy");
  const [year, setYear] = useState(currentYear);
  const [view, setView] = useState<"grid" | "trends" | "alerts">("grid");
  const [data, setData] = useState<InventoryAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    loadInventoryAnalytics(mode, year)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unable to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, year]);

  const years = useMemo(
    () => Array.from({ length: 5 }, (_, index) => currentYear - index),
    [],
  );
  const tabs = [
    { id: "grid" as const, label: "Purchase grid" },
    { id: "trends" as const, label: "Trends" },
    { id: "alerts" as const, label: "Restock alerts" },
  ];
  const viewDescription = view === "grid"
    ? "Monthly purchase table from the PM purchase report. Each month shows quantity purchased and spend paid."
    : view === "trends"
      ? "Monthly purchase spend across the selected 12-month period."
      : "Latest reported shelf stock compared with recent movement to highlight materials needing review.";

  function exportWorkbook() {
    if (!data) return;
    const gridRows = data.grid.map((row) => {
      const output: Record<string, string | number> = {
        Material: row.materialName,
        Unit: row.unit,
      };
      data.months.forEach((month, index) => {
        output[`${month.label} Qty`] = row.monthlyQuantity[index];
        output[`${month.label} Spend`] = row.monthlySpend[index];
      });
      output["Total Qty"] = row.totalQuantity;
      output["Total Spend"] = row.totalSpend;
      return output;
    });
    const trendRows = data.trends.map((row) => ({
      Month: row.label,
      Quantity: row.quantity,
      Spend: row.spend,
    }));
    const alertRows = data.alerts.map((row) => ({
      Material: row.materialName,
      Unit: row.unit,
      "Latest stock": row.stock,
      "Trailing 90-day quantity": row.trailing90DayQuantity,
      "Days of stock": row.daysOfStock ?? "No history",
      "Minimum stock": row.minStock ?? "Not set",
      Status: row.status,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(gridRows),
      "Purchase grid",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(trendRows),
      "Monthly trends",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(alertRows),
      "Stock alerts",
    );
    XLSX.writeFile(workbook, `pm-purchase-${mode}-${year}.xlsx`);
  }

  const maxSpend = Math.max(...(data?.trends.map((row) => row.spend) ?? [0]), 1);

  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Inventory Management"
          title="Analytics"
          subtitle="Review packaging-material purchases, stock cover, and restock signals."
          action={
            <button
              type="button"
              className={buttonPrimary}
              disabled={!data || loading}
              onClick={exportWorkbook}
            >
              Export Excel
            </button>
          }
        />
        <div className="flex flex-wrap items-end gap-4">
          <div className="inline-flex rounded-lg border border-edge bg-surface-2 p-1">
            {(["cy", "fy"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`rounded-md px-4 py-2 text-sm font-medium ${mode === value ? "bg-surface text-fg shadow-card" : "text-fg-muted"}`}
                onClick={() => setMode(value)}
              >
                {value === "cy" ? "Calendar year" : "Financial year"}
              </button>
            ))}
          </div>
          <label>
            <span className="sr-only">Year</span>
            <select
              className={selectField}
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((value) => (
                <option key={value} value={value}>
                  {mode === "cy" ? `CY ${value}` : `FY ${value}-${String(value + 1).slice(-2)}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <SegmentedTabs tabs={tabs} active={view} onChange={setView} />
        <p className="text-sm text-fg-muted">{viewDescription}</p>
        {error ? <div className={alertDanger}>{error}</div> : null}
        {loading ? <p role="status">Loading analytics…</p> : null}
        {data ? (
          <>
            <p className="text-sm text-fg-muted">Showing {data.periodLabel}. Purchase totals are scoped to the branches you can access.</p>
            {!data.summary.purchaseQuantity ? (
              <div className={alertInfo}>
                No purchases are recorded for {data.periodLabel}. The zeroes in the grid mean no purchase entries were found for those months; they do not mean the materials are out of stock.
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Latest reported stock" value={quantity(data.summary.latestStock)} hint="All active materials" />
              <SummaryCard label="Purchase quantity" value={quantity(data.summary.purchaseQuantity)} hint={data.periodLabel} />
              <SummaryCard label="Purchase spend" value={money(data.summary.purchaseSpend)} hint={data.periodLabel} />
              <SummaryCard label="Low-stock materials" value={quantity(data.summary.lowStockMaterials)} hint="Needs review" />
            </div>
            {view === "alerts" ? <StockAlerts data={data} /> : null}
            {view === "trends" ? <TrendChart data={data} maxSpend={maxSpend} /> : null}
            {view === "grid" ? <PurchaseGrid data={data} /> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className={cardPadded}>
      <p className="text-sm text-fg-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-fg-subtle">{hint}</p>
    </article>
  );
}

function StockAlerts({ data }: { data: InventoryAnalyticsResponse }) {
  const alerts = data.alerts.filter((row) => row.status !== "healthy");
  return (
    <section className={`${cardPadded} space-y-4`}>
      <div>
        <h2 className="text-lg font-semibold">Restock alerts</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Days of stock uses the latest reported count and trailing 90-day purchase quantity. Materials without movement use the configured minimum as a fallback.
        </p>
      </div>
      {!alerts.length ? (
        <div className={alertInfo}>No low-stock materials need attention.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((row) => (
            <div key={row.materialId} className="rounded-lg border border-edge bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium">{row.materialName}</h3>
                <span className={badgeClass(row.status === "low" ? "warning" : "neutral")}>
                  {row.status === "low" ? "Restock" : "No history"}
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{quantity(row.stock)} <span className="text-sm font-normal text-fg-muted">{row.unit}</span></p>
              <p className="mt-1 text-xs text-fg-muted">
                {row.daysOfStock === null ? "Days of stock unavailable" : `${Math.round(row.daysOfStock)} days of stock`}
                {row.minStock !== null ? ` · minimum ${quantity(row.minStock)}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TrendChart({ data, maxSpend }: { data: InventoryAnalyticsResponse; maxSpend: number }) {
  return (
    <section className={`${cardPadded} space-y-4`}>
      <div>
        <h2 className="text-lg font-semibold">Monthly purchase trend</h2>
        <p className="mt-1 text-sm text-fg-muted">Spend bars are scaled to the highest month in the selected period.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
        {data.trends.map((row) => (
          <div key={row.month} className="space-y-2">
            <div className="flex h-32 items-end rounded-lg bg-surface-2 p-2">
              <div className="w-full rounded bg-accent" style={{ height: `${Math.max((row.spend / maxSpend) * 100, row.spend ? 5 : 0)}%` }} title={money(row.spend)} />
            </div>
            <p className="text-center text-xs font-medium text-fg-muted">{row.label}</p>
            <p className="text-center text-xs tabular-nums">{money(row.spend)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PurchaseGrid({ data }: { data: InventoryAnalyticsResponse }) {
  const monthlyTotals = data.months.map((_, index) => ({
    quantity: data.grid.reduce((sum, row) => sum + row.monthlyQuantity[index], 0),
    spend: data.grid.reduce((sum, row) => sum + row.monthlySpend[index], 0),
  }));
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Monthly purchase table</h2>
        <p className="mt-1 text-sm text-fg-muted">This is the digital version of the monthly PM purchase sheet. Every cell shows <span className="font-medium">Qty</span> on the first line and <span className="font-medium">Spend</span> underneath.</p>
      </div>
      <div className={tableWrapper}>
        <table className={tableBase}>
          <thead className={`${tableHead} sticky top-0 z-10`}>
            <tr>
              <th className={tableHeadCell}>Material</th>
              {data.months.map((month) => (
                <th key={month.key} className={tableHeadCell}>
                  <span className="block">{month.label}</span>
                  <span className="mt-1 block text-xs font-normal normal-case tracking-normal">Qty / spend</span>
                </th>
              ))}
              <th className={tableHeadCell}>Total qty</th>
              <th className={tableHeadCell}>Total spend</th>
            </tr>
          </thead>
          <tbody>
            {data.grid.map((row) => (
              <tr key={row.materialId} className={tableRow}>
                <td className={tableCell}><span className="font-medium">{row.materialName}</span><span className="ml-1 text-xs text-fg-muted">({row.unit})</span></td>
                {data.months.map((month, index) => (
                  <td key={month.key} className={tableCell}>
                    <div className="tabular-nums"><span className="mr-1 text-xs text-fg-muted">Qty</span>{quantity(row.monthlyQuantity[index])}</div>
                    <div className="text-xs text-fg-muted"><span className="mr-1">Spend</span>{money(row.monthlySpend[index])}</div>
                  </td>
                ))}
                <td className={tableCell}>{quantity(row.totalQuantity)}</td>
                <td className={tableCell}>{money(row.totalSpend)}</td>
              </tr>
            ))}
            {!data.grid.length ? <tr><td colSpan={data.months.length + 3} className={tableCell}>No active materials.</td></tr> : null}
          </tbody>
          {data.grid.length ? (
            <tfoot className="border-t-2 border-edge-strong bg-surface-2">
              <tr>
                <td className={`${tableCell} font-semibold`}>Monthly total</td>
                {monthlyTotals.map((total, index) => (
                  <td key={data.months[index].key} className={`${tableCell} font-semibold`}>
                    <div className="tabular-nums"><span className="mr-1 text-xs text-fg-muted">Qty</span>{quantity(total.quantity)}</div>
                    <div className="text-xs text-fg-muted"><span className="mr-1">Spend</span>{money(total.spend)}</div>
                  </td>
                ))}
                <td className={`${tableCell} font-semibold`}>{quantity(data.grid.reduce((sum, row) => sum + row.totalQuantity, 0))}</td>
                <td className={`${tableCell} font-semibold`}>{money(data.grid.reduce((sum, row) => sum + row.totalSpend, 0))}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </section>
  );
}
