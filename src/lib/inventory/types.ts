// src/lib/inventory/types.ts
// Shapes shared by the inventory API routes and the client components.
// JSON is camelCase; the SQL in setup.ts aliases columns to match.

export const INVENTORY_HISTORY_PAGE_SIZE = 20;

export type InventoryBranch = {
  id: string;
  name: string;
  isCentral: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryMaterial = {
  id: string;
  name: string;
  unit: string;
  minStock: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/* A branch-role user and the branches they may report stock for. */
export type InventoryAssignment = {
  profileId: string;
  username: string;
  fullName: string | null;
  email: string;
  status: string;
  branchIds: string[];
};

export type InventoryCount = {
  id: string;
  branchId: string;
  materialId: string;
  countDate: string;
  quantity: number;
  version: number;
  updatedAt: string;
};

export type CountInput = {
  materialId: string;
  quantity: number;
  version: number | null;
};
export type StockData = {
  isCompanyView: boolean;
  branches: InventoryBranch[];
  materials: InventoryMaterial[];
  counts: InventoryCount[];
};
export type CountEdit = {
  id: string;
  countId: string;
  branchId: string;
  countDate: string;
  oldQuantity: number | null;
  newQuantity: number;
  editedBy: string;
  editedAt: string;
  version: number;
};

export type InventoryVendor = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  purchaseCount?: number;
  totalSpend?: number;
};

export type InventoryPurchase = {
  id: string;
  branchId: string;
  branchName: string;
  materialId: string;
  materialName: string;
  materialUnit: string;
  vendorId: string;
  vendorName: string;
  purchaseDate: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  invoicePath: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  sixMonthAverage: number | null;
  priceSignal: "good" | "high" | "normal" | "no_history";
};

export type InventoryDispatch = {
  id: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  materialId: string;
  materialName: string;
  materialUnit: string;
  quantitySent: number;
  quantityReceived: number | null;
  status: "in_transit" | "received";
  dispatchedAt: string;
  receivedAt: string | null;
  createdBy: string;
  receivedBy: string | null;
  notes: string | null;
};
export type InventoryCountRequest = {
  id: string;
  branchId: string;
  branchName: string;
  requestedBy: string;
  requestedAt: string;
  dueDate: string | null;
  note: string | null;
  completedAt: string | null;
  completedBy: string | null;
};
export type InventoryReconciliation = {
  branchId: string;
  branchName: string;
  materialId: string;
  materialName: string;
  unit: string;
  month: string;
  opening: number | null;
  received: number;
  sent: number;
  closing: number | null;
  used: number | null;
};

export type InventoryAnalyticsMode = "cy" | "fy";

export type InventoryAnalyticsMonth = {
  key: string;
  label: string;
};

export type InventoryAnalyticsGridRow = {
  materialId: string;
  materialName: string;
  unit: string;
  monthlyQuantity: number[];
  monthlySpend: number[];
  totalQuantity: number;
  totalSpend: number;
};

export type InventoryAnalyticsTrend = {
  month: string;
  label: string;
  quantity: number;
  spend: number;
};

export type InventoryStockAlert = {
  materialId: string;
  materialName: string;
  unit: string;
  stock: number;
  trailing90DayQuantity: number;
  daysOfStock: number | null;
  minStock: number | null;
  status: "low" | "healthy" | "no_history";
};

export type InventoryAnalyticsResponse = {
  mode: InventoryAnalyticsMode;
  year: number;
  periodLabel: string;
  months: InventoryAnalyticsMonth[];
  grid: InventoryAnalyticsGridRow[];
  trends: InventoryAnalyticsTrend[];
  alerts: InventoryStockAlert[];
  summary: {
    latestStock: number;
    lowStockMaterials: number;
    purchaseSpend: number;
    purchaseQuantity: number;
  };
};
