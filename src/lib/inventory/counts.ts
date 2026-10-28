import { db } from "@/lib/db";
import {
  INVENTORY_HISTORY_PAGE_SIZE,
  type CountEdit,
  type CountInput,
  type InventoryCount,
} from "./types";

const columns = `id::text, branch_id::text as "branchId", material_id::text as "materialId",
  to_char(count_date, 'YYYY-MM-DD') as "countDate", quantity, version,
  updated_at::text as "updatedAt"`;

export class CountError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function listCounts(
  branchIds: string[],
  date?: string,
): Promise<InventoryCount[]> {
  const result = await db.query<InventoryCount>(
    `
    select distinct on (branch_id, material_id) ${columns}
    from public.inventory_counts
    where branch_id = any($1::uuid[]) and ($2::date is null or count_date = $2::date)
    order by branch_id, material_id, count_date desc`,
    [branchIds, date ?? null],
  );
  return result.rows;
}

export async function saveCounts(
  branchId: string,
  date: string,
  entries: CountInput[],
  profileId: string,
) {
  const client = await db.connect();
  try {
    await client.query("begin");
    // Serialize submissions per branch, including races to create the first count.
    const branch = await client.query(
      "select id from public.inventory_branches where id = $1 and is_active for update",
      [branchId],
    );
    if (!branch.rowCount)
      throw new CountError("Branch is inactive or unavailable", 404);
    // Recheck authorization inside the transaction; never trust a submitted actor.
    const allowed = await client.query(
      `select id from public.profiles p where p.id = $1 and p.status = 'active'
      and (p.role = 'admin' or (p.role = 'branch' and exists (
        select 1 from public.inventory_branch_assignments a where a.profile_id = p.id and a.branch_id = $2)))`,
      [profileId, branchId],
    );
    if (!allowed.rowCount)
      throw new CountError(
        "Branch access has changed. Reload and try again.",
        403,
      );
    const materials = await client.query(
      "select id from public.inventory_materials where id = any($1::uuid[]) and is_active for share",
      [entries.map((e) => e.materialId)],
    );
    if (materials.rowCount !== entries.length)
      throw new CountError("One or more materials are inactive or unavailable");
    for (const entry of entries) {
      const current = await client.query<{
        id: string;
        version: number;
        quantity: number;
      }>(
        "select id, version, quantity from public.inventory_counts where branch_id = $1 and material_id = $2 and count_date = $3 for update",
        [branchId, entry.materialId, date],
      );
      const row = current.rows[0];
      if ((row?.version ?? null) !== entry.version)
        throw new CountError(
          "Someone updated this count. Reload the counts before saving again.",
          409,
        );
      if (row) {
        if (row.quantity === entry.quantity) continue;
        await client.query(
          `update public.inventory_counts set quantity = $2, version = version + 1,
          updated_by = $3, updated_at = now() where id = $1`,
          [row.id, entry.quantity, profileId],
        );
      } else {
        await client.query(
          `insert into public.inventory_counts (branch_id, material_id, count_date, quantity, updated_by)
          values ($1, $2, $3, $4, $5)`,
          [branchId, entry.materialId, date, entry.quantity, profileId],
        );
      }
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function countHistory(
  branchIds: string[],
  materialId: string,
  offset: number,
): Promise<CountEdit[]> {
  const result = await db.query<CountEdit>(
    `select e.id::text, c.id::text as "countId",
    c.branch_id::text as "branchId", to_char(c.count_date, 'YYYY-MM-DD') as "countDate",
    case when e.version = 1 then (
      select previous.quantity
      from public.inventory_counts previous
      where previous.branch_id = c.branch_id
        and previous.material_id = c.material_id
        and previous.count_date < c.count_date
      order by previous.count_date desc
      limit 1
    ) else e.old_quantity end as "oldQuantity",
    e.new_quantity as "newQuantity",
    coalesce(p.full_name, p.username) as "editedBy", e.edited_at::text as "editedAt", e.version
    from public.inventory_count_edits e join public.inventory_counts c on c.id = e.count_id
    join public.profiles p on p.id = e.edited_by
    where c.branch_id = any($1::uuid[]) and c.material_id = $2
    order by e.edited_at desc, e.id desc limit ${INVENTORY_HISTORY_PAGE_SIZE} offset $3`,
    [branchIds, materialId, offset],
  );
  return result.rows;
}
