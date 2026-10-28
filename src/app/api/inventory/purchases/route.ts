import type { NextRequest } from "next/server";
import {
  canAccessBranch,
  requireInventoryAccess,
} from "@/lib/inventory/access";
import {
  cleanOptionalText,
  isUuid,
  jsonError,
  jsonOk,
  parseMoney,
  parsePositiveInteger,
  readJsonBody,
} from "@/lib/inventory/http";
import { createPurchase, listPurchases } from "@/lib/inventory/vendors";
import { validCountDate } from "@/lib/inventory/count-validation";
import { listBranches, listMaterials } from "@/lib/inventory/setup";
import { listVendors } from "@/lib/inventory/vendors";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const auth = await requireInventoryAccess(req);
  if (!auth.ok) return auth.response;
  try {
    const [branches, materials, vendors, purchases] = await Promise.all([
      listBranches(),
      listMaterials(),
      auth.user.role === "admin" ? listVendors() : Promise.resolve([]),
      listPurchases(auth.branchIds, {
        materialId: req.nextUrl.searchParams.get("materialId") ?? undefined,
        vendorId: req.nextUrl.searchParams.get("vendorId") ?? undefined,
        from: req.nextUrl.searchParams.get("from") ?? undefined,
        to: req.nextUrl.searchParams.get("to") ?? undefined,
      }),
    ]);
    return jsonOk({
      branches: branches.filter((b) => canAccessBranch(auth, b.id)),
      materials,
      vendors,
      purchases,
    });
  } catch {
    return jsonError("Unable to load purchases", 500);
  }
}
export async function POST(req: NextRequest) {
  const auth = await requireInventoryAccess(req);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");
  const quantity = parsePositiveInteger(body.quantity);
  const unitPrice = parseMoney(body.unitPrice);
  const notes = cleanOptionalText(body.notes, 1000);
  const date = body.purchaseDate;
  if (
    !isUuid(body.branchId) ||
    !isUuid(body.materialId) ||
    !isUuid(body.vendorId) ||
    !validCountDate(date) ||
    date < "2026-09-01" ||
    quantity === undefined ||
    unitPrice === undefined ||
    notes === undefined ||
    (body.invoicePath !== undefined &&
      body.invoicePath !== null &&
      typeof body.invoicePath !== "string")
  )
    return jsonError("Enter valid purchase details");
  if (!canAccessBranch(auth, body.branchId))
    return jsonError("You cannot record a purchase for this branch", 403);
  try {
    const id = await createPurchase({
      branchId: body.branchId,
      materialId: body.materialId,
      vendorId: body.vendorId,
      purchaseDate: date,
      quantity,
      unitPrice,
      invoicePath: body.invoicePath as string | null | undefined,
      notes,
      createdBy: auth.user.id,
      isDemo: auth.user.isDemoAccount,
    });
    return jsonOk({ id }, 201);
  } catch {
    return jsonError("Unable to save purchase", 500);
  }
}
