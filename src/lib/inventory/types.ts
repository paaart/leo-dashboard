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
