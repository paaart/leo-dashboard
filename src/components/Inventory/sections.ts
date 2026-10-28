/*
  The Inventory Management sub-sections and who may open each one. Lives
  outside DashboardShell so Sidebar can import values without a circular
  import (Sidebar ↔ DashboardShell).
*/
import type { AppRole } from "@/lib/roles";

export type InventorySub =
  | "overview"
  | "update"
  | "purchases"
  | "dispatches"
  | "count-requests"
  | "reconciliation"
  | "setup";

export const INVENTORY_SUBS: {
  id: InventorySub;
  label: string;
  roles: readonly AppRole[];
}[] = [
  { id: "overview", label: "Overview", roles: ["admin", "branch"] },
  { id: "update", label: "Update stock", roles: ["admin", "branch"] },
  { id: "purchases", label: "Purchases", roles: ["admin", "branch"] },
  { id: "dispatches", label: "Dispatches", roles: ["admin", "branch"] },
  { id: "count-requests", label: "Count requests", roles: ["admin", "branch"] },
  { id: "reconciliation", label: "Reconciliation", roles: ["admin", "branch"] },
  { id: "setup", label: "Setup", roles: ["admin"] },
];

export function inventorySubsForRole(role: AppRole) {
  return INVENTORY_SUBS.filter((sub) => sub.roles.includes(role));
}

export function canOpenInventorySub(role: AppRole, sub: InventorySub) {
  return INVENTORY_SUBS.some((s) => s.id === sub && s.roles.includes(role));
}

/* The first sub-section this role is allowed to see; null if none. */
export function defaultInventorySub(role: AppRole): InventorySub | null {
  return inventorySubsForRole(role)[0]?.id ?? null;
}
