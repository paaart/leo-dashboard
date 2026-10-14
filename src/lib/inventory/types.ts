// src/lib/inventory/types.ts
// Shapes shared by the inventory API routes and the client components.
// JSON is camelCase; the SQL in setup.ts aliases columns to match.

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

export type CountInput = { materialId: string; quantity: number; version: number | null };
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
