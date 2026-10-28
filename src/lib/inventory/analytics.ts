import { db } from "@/lib/db";
import type {
  InventoryAnalyticsGridRow,
  InventoryAnalyticsMode,
  InventoryAnalyticsMonth,
  InventoryAnalyticsResponse,
  InventoryAnalyticsTrend,
  InventoryStockAlert,
} from "./types";

type Period = {
  start: string;
  end: string;
  label: string;
  months: InventoryAnalyticsMonth[];
};

function monthLabel(key: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "short" }).format(
    new Date(`${key}-01T00:00:00Z`),
  );
}

function periodFor(mode: InventoryAnalyticsMode, year: number): Period {
  const startMonth = mode === "fy" ? 4 : 1;
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const endYear = year + 1;
  const endMonth = mode === "fy" ? 4 : 1;
  const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
  const months = Array.from({ length: 12 }, (_, index) => {
    const monthIndex = startMonth - 1 + index;
    const date = new Date(Date.UTC(year, monthIndex, 1));
    const key = date.toISOString().slice(0, 7);
    return { key, label: monthLabel(key) };
  });
  return {
    start,
    end,
    label: mode === "fy" ? `FY ${year}-${String(year + 1).slice(-2)}` : `CY ${year}`,
    months,
  };
}

type MaterialRow = {
  id: string;
  name: string;
  unit: string;
  minStock: number | null;
};

type PurchaseRow = {
  materialId: string;
  month: string;
  quantity: number;
  spend: number;
};

type StockRow = { materialId: string; quantity: number };
type UsageRow = { materialId: string; quantity: number };

export async function getInventoryAnalytics(
  branchIds: string[] | "all",
  mode: InventoryAnalyticsMode,
  year: number,
): Promise<InventoryAnalyticsResponse> {
  const period = periodFor(mode, year);
  const allBranches = branchIds === "all";
  const [materialsResult, purchasesResult, stockResult, usageResult] =
    await Promise.all([
      db.query<MaterialRow>(
        `select id::text, name, unit, min_stock as "minStock"
         from public.inventory_materials where is_active order by sort_order, lower(name)`,
      ),
      db.query<PurchaseRow>(
        `select p.material_id::text as "materialId",
          to_char(date_trunc('month', p.purchase_date), 'YYYY-MM') as month,
          sum(p.quantity)::int as quantity,
          sum(p.quantity * p.unit_price)::numeric as spend
         from public.inventory_purchases p
         where ($1::boolean or p.branch_id = any($2::uuid[]))
           and p.purchase_date >= $3::date and p.purchase_date < $4::date
         group by p.material_id, date_trunc('month', p.purchase_date)`,
        [allBranches, allBranches ? [] : branchIds, period.start, period.end],
      ),
      db.query<StockRow>(
        `select material_id::text as "materialId", sum(quantity)::int as quantity
         from (
           select distinct on (branch_id, material_id) branch_id, material_id, quantity
           from public.inventory_counts
           where ($1::boolean or branch_id = any($2::uuid[]))
           order by branch_id, material_id, count_date desc
         ) latest group by material_id`,
        [allBranches, allBranches ? [] : branchIds],
      ),
      db.query<UsageRow>(
        `select material_id::text as "materialId", coalesce(sum(quantity), 0)::int as quantity
         from public.inventory_purchases
         where ($1::boolean or branch_id = any($2::uuid[]))
           and purchase_date >= ((now() at time zone 'Asia/Kolkata')::date - 90)
           and purchase_date <= (now() at time zone 'Asia/Kolkata')::date
         group by material_id`,
        [allBranches, allBranches ? [] : branchIds],
      ),
    ]);

  const purchaseByKey = new Map(
    purchasesResult.rows.map((row) => [
      `${row.materialId}:${row.month}`,
      { quantity: Number(row.quantity), spend: Number(row.spend) },
    ]),
  );
  const stockByMaterial = new Map(
    stockResult.rows.map((row) => [row.materialId, Number(row.quantity)]),
  );
  const usageByMaterial = new Map(
    usageResult.rows.map((row) => [row.materialId, Number(row.quantity)]),
  );

  const grid: InventoryAnalyticsGridRow[] = materialsResult.rows.map((material) => {
    const monthlyQuantity = period.months.map(
      (month) => purchaseByKey.get(`${material.id}:${month.key}`)?.quantity ?? 0,
    );
    const monthlySpend = period.months.map(
      (month) => purchaseByKey.get(`${material.id}:${month.key}`)?.spend ?? 0,
    );
    return {
      materialId: material.id,
      materialName: material.name,
      unit: material.unit,
      monthlyQuantity,
      monthlySpend,
      totalQuantity: monthlyQuantity.reduce((sum, value) => sum + value, 0),
      totalSpend: monthlySpend.reduce((sum, value) => sum + value, 0),
    };
  });

  const trends: InventoryAnalyticsTrend[] = period.months.map((month) => {
    const values = grid.map((row) => {
      const index = period.months.findIndex((item) => item.key === month.key);
      return { quantity: row.monthlyQuantity[index], spend: row.monthlySpend[index] };
    });
    return {
      month: month.key,
      label: month.label,
      quantity: values.reduce((sum, value) => sum + value.quantity, 0),
      spend: values.reduce((sum, value) => sum + value.spend, 0),
    };
  });

  const alerts: InventoryStockAlert[] = materialsResult.rows.map((material) => {
    const stock = stockByMaterial.get(material.id) ?? 0;
    const trailing90DayQuantity = usageByMaterial.get(material.id) ?? 0;
    const daysOfStock = trailing90DayQuantity
      ? (stock / (trailing90DayQuantity / 90))
      : null;
    const status: InventoryStockAlert["status"] = daysOfStock === null
      ? material.minStock !== null && stock < material.minStock
        ? "low"
        : "no_history"
      : daysOfStock <= 30
        ? "low"
        : "healthy";
    return {
      materialId: material.id,
      materialName: material.name,
      unit: material.unit,
      stock,
      trailing90DayQuantity,
      daysOfStock,
      minStock: material.minStock,
      status,
    };
  }).sort((a, b) => {
    const rank: Record<InventoryStockAlert["status"], number> = {
      low: 0,
      no_history: 1,
      healthy: 2,
    };
    return rank[a.status] - rank[b.status] || a.materialName.localeCompare(b.materialName);
  });

  return {
    mode,
    year,
    periodLabel: period.label,
    months: period.months,
    grid,
    trends,
    alerts,
    summary: {
      latestStock: alerts.reduce((sum, row) => sum + row.stock, 0),
      lowStockMaterials: alerts.filter((row) => row.status === "low").length,
      purchaseSpend: trends.reduce((sum, row) => sum + row.spend, 0),
      purchaseQuantity: trends.reduce((sum, row) => sum + row.quantity, 0),
    },
  };
}

export async function getInventoryHomeSummary() {
  const result = await getInventoryAnalytics("all", "cy", new Date().getFullYear());
  return result.summary;
}
