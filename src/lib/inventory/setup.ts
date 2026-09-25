// src/lib/inventory/setup.ts
// Server-side reads/writes for the Inventory Management reference data:
// branches, materials, and branch-staff assignments. Pattern C (raw pg).
import { db } from "@/lib/db";
import type {
  InventoryAssignment,
  InventoryBranch,
  InventoryMaterial,
} from "./types";

const BRANCH_COLUMNS = `
  id::text            as "id",
  name                as "name",
  is_central          as "isCentral",
  is_active           as "isActive",
  sort_order          as "sortOrder",
  created_at::text    as "createdAt",
  updated_at::text    as "updatedAt"
`;

const MATERIAL_COLUMNS = `
  id::text            as "id",
  name                as "name",
  unit                as "unit",
  min_stock           as "minStock",
  is_active           as "isActive",
  sort_order          as "sortOrder",
  created_at::text    as "createdAt",
  updated_at::text    as "updatedAt"
`;

/* ---------- Branches ---------- */

export async function listBranches(opts?: {
  includeInactive?: boolean;
}): Promise<InventoryBranch[]> {
  const res = await db.query<InventoryBranch>(
    `
    select ${BRANCH_COLUMNS}
    from public.inventory_branches
    where ($1::boolean or is_active)
    order by sort_order, lower(name)
    `,
    [opts?.includeInactive ?? false]
  );
  return res.rows;
}

export async function createBranch(name: string): Promise<InventoryBranch> {
  // New branches go to the end of the list.
  const res = await db.query<InventoryBranch>(
    `
    insert into public.inventory_branches (name, sort_order)
    values (
      $1,
      (select coalesce(max(sort_order), 0) + 1 from public.inventory_branches)
    )
    returning ${BRANCH_COLUMNS}
    `,
    [name]
  );
  return res.rows[0];
}

export type BranchPatch = {
  name?: string;
  isActive?: boolean;
  isCentral?: boolean;
};

export type UpdateResult<T> =
  | { ok: true; row: T }
  | { ok: false; error: string; status: number };

export async function updateBranch(
  id: string,
  patch: BranchPatch
): Promise<UpdateResult<InventoryBranch>> {
  const client = await db.connect();

  try {
    await client.query("begin");

    const current = await client.query<InventoryBranch>(
      `select ${BRANCH_COLUMNS} from public.inventory_branches where id = $1::uuid for update`,
      [id]
    );
    if (current.rowCount === 0) {
      await client.query("rollback");
      return { ok: false, error: "Branch not found", status: 404 };
    }
    const row = current.rows[0];

    // The central store is where purchases land and dispatches leave from;
    // the module needs exactly one, so it can't be switched off — only moved.
    if (patch.isActive === false && row.isCentral) {
      await client.query("rollback");
      return {
        ok: false,
        error: "Make another branch the central store before deactivating this one",
        status: 400,
      };
    }

    if (patch.isCentral === true && !row.isCentral) {
      if (!row.isActive && patch.isActive !== true) {
        await client.query("rollback");
        return {
          ok: false,
          error: "An inactive branch cannot be the central store",
          status: 400,
        };
      }
      await client.query(
        `update public.inventory_branches set is_central = false where is_central`
      );
    }

    if (patch.isCentral === false && row.isCentral) {
      await client.query("rollback");
      return {
        ok: false,
        error: "Choose a different branch as the central store instead",
        status: 400,
      };
    }

    const updated = await client.query<InventoryBranch>(
      `
      update public.inventory_branches
      set
        name       = coalesce($2, name),
        is_active  = coalesce($3, is_active),
        is_central = coalesce($4, is_central)
      where id = $1::uuid
      returning ${BRANCH_COLUMNS}
      `,
      [id, patch.name ?? null, patch.isActive ?? null, patch.isCentral ?? null]
    );

    await client.query("commit");
    return { ok: true, row: updated.rows[0] };
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      // Ignore rollback errors so the original failure is returned.
    }
    throw err;
  } finally {
    client.release();
  }
}

/* ---------- Materials ---------- */

export async function listMaterials(opts?: {
  includeInactive?: boolean;
}): Promise<InventoryMaterial[]> {
  const res = await db.query<InventoryMaterial>(
    `
    select ${MATERIAL_COLUMNS}
    from public.inventory_materials
    where ($1::boolean or is_active)
    order by sort_order, lower(name)
    `,
    [opts?.includeInactive ?? false]
  );
  return res.rows;
}

export async function createMaterial(input: {
  name: string;
  unit: string;
  minStock: number | null;
}): Promise<InventoryMaterial> {
  const res = await db.query<InventoryMaterial>(
    `
    insert into public.inventory_materials (name, unit, min_stock, sort_order)
    values (
      $1, $2, $3,
      (select coalesce(max(sort_order), 0) + 1 from public.inventory_materials)
    )
    returning ${MATERIAL_COLUMNS}
    `,
    [input.name, input.unit, input.minStock]
  );
  return res.rows[0];
}

export type MaterialPatch = {
  name?: string;
  unit?: string;
  /* undefined = leave alone; null = clear the minimum */
  minStock?: number | null;
  isActive?: boolean;
};

export async function updateMaterial(
  id: string,
  patch: MaterialPatch
): Promise<InventoryMaterial | null> {
  // min_stock is nullable, so "clear it" can't ride on coalesce like the
  // others; a separate flag says whether the column is being written.
  const res = await db.query<InventoryMaterial>(
    `
    update public.inventory_materials
    set
      name      = coalesce($2, name),
      unit      = coalesce($3, unit),
      min_stock = case when $4::boolean then $5::integer else min_stock end,
      is_active = coalesce($6, is_active)
    where id = $1::uuid
    returning ${MATERIAL_COLUMNS}
    `,
    [
      id,
      patch.name ?? null,
      patch.unit ?? null,
      patch.minStock !== undefined,
      patch.minStock ?? null,
      patch.isActive ?? null,
    ]
  );
  return res.rows[0] ?? null;
}

/* ---------- Branch-staff assignments ---------- */

export async function listAssignments(): Promise<InventoryAssignment[]> {
  const res = await db.query<InventoryAssignment>(
    `
    select
      p.id::text     as "profileId",
      p.username     as "username",
      p.full_name    as "fullName",
      p.email        as "email",
      p.status       as "status",
      coalesce(
        array_agg(a.branch_id::text order by b.sort_order) filter (where a.branch_id is not null),
        '{}'
      )              as "branchIds"
    from public.profiles p
    left join public.inventory_branch_assignments a on a.profile_id = p.id
    left join public.inventory_branches b on b.id = a.branch_id
    where p.role = 'branch'
      and p.status in ('active', 'inactive')
    group by p.id
    order by p.status, lower(coalesce(p.full_name, p.username))
    `
  );
  return res.rows;
}

export async function getAssignedBranchIds(profileId: string): Promise<string[]> {
  const res = await db.query<{ branchId: string }>(
    `
    select a.branch_id::text as "branchId"
    from public.inventory_branch_assignments a
    join public.inventory_branches b on b.id = a.branch_id
    where a.profile_id = $1::uuid and b.is_active
    order by b.sort_order
    `,
    [profileId]
  );
  return res.rows.map((r) => r.branchId);
}

/* Replaces the whole set for one user. */
export async function setAssignments(
  profileId: string,
  branchIds: string[]
): Promise<UpdateResult<InventoryAssignment>> {
  const client = await db.connect();

  try {
    await client.query("begin");

    const profile = await client.query<{ role: string }>(
      `select role from public.profiles where id = $1::uuid for update`,
      [profileId]
    );
    if (profile.rowCount === 0) {
      await client.query("rollback");
      return { ok: false, error: "User not found", status: 404 };
    }
    if (profile.rows[0].role !== "branch") {
      await client.query("rollback");
      return {
        ok: false,
        error: "Only branch-staff users can be assigned to branches",
        status: 400,
      };
    }

    const known = await client.query<{ count: string }>(
      `select count(*)::text as count from public.inventory_branches where id = any($1::uuid[])`,
      [branchIds]
    );
    if (Number(known.rows[0].count) !== branchIds.length) {
      await client.query("rollback");
      return { ok: false, error: "One or more branches do not exist", status: 400 };
    }

    await client.query(
      `delete from public.inventory_branch_assignments where profile_id = $1::uuid`,
      [profileId]
    );
    if (branchIds.length > 0) {
      await client.query(
        `
        insert into public.inventory_branch_assignments (profile_id, branch_id)
        select $1::uuid, unnest($2::uuid[])
        `,
        [profileId, branchIds]
      );
    }

    await client.query("commit");
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      // Ignore rollback errors so the original failure is returned.
    }
    throw err;
  } finally {
    client.release();
  }

  const rows = await listAssignments();
  const row = rows.find((r) => r.profileId === profileId);
  return row
    ? { ok: true, row }
    : { ok: false, error: "User not found", status: 404 };
}
