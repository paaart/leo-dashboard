import { db } from "@/lib/db";
import { demoDescription } from "./demo";
import type {
  InventoryCountRequest,
  InventoryDispatch,
  InventoryReconciliation,
} from "./types";

const dispatchColumns = `d.id::text as "id", d.from_branch_id::text as "fromBranchId", fb.name as "fromBranchName",
 d.to_branch_id::text as "toBranchId", tb.name as "toBranchName", d.material_id::text as "materialId",
 m.name as "materialName", m.unit as "materialUnit", d.quantity_sent as "quantitySent", d.quantity_received as "quantityReceived",
 d.status, d.dispatched_at::text as "dispatchedAt", d.received_at::text as "receivedAt",
 coalesce(cp.full_name,cp.username) as "createdBy", coalesce(rp.full_name,rp.username) as "receivedBy", d.notes`;

export async function listDispatches(
  branchIds: string[] | "all",
  status?: string,
) {
  const result = await db.query<InventoryDispatch>(
    `select ${dispatchColumns} from public.inventory_dispatches d
    join public.inventory_branches fb on fb.id=d.from_branch_id join public.inventory_branches tb on tb.id=d.to_branch_id
    join public.inventory_materials m on m.id=d.material_id join public.profiles cp on cp.id=d.created_by
    left join public.profiles rp on rp.id=d.received_by
    where ($1::boolean or d.from_branch_id=any($2::uuid[]) or d.to_branch_id=any($2::uuid[]))
      and ($3::text is null or d.status=$3) order by d.dispatched_at desc limit 500`,
    [branchIds === "all", branchIds === "all" ? [] : branchIds, status ?? null],
  );
  return result.rows;
}
export async function createDispatch(input: {
  fromBranchId: string;
  toBranchId: string;
  materialId: string;
  quantitySent: number;
  notes?: string | null;
  createdBy: string;
  isDemo: boolean;
}) {
  const result = await db.query<{ id: string }>(
    `insert into public.inventory_dispatches (from_branch_id,to_branch_id,material_id,quantity_sent,notes,created_by)
    values ($1,$2,$3,$4,$5,$6) returning id::text`,
    [
      input.fromBranchId,
      input.toBranchId,
      input.materialId,
      input.quantitySent,
      demoDescription(input.isDemo, input.notes),
      input.createdBy,
    ],
  );
  return result.rows[0].id;
}
export async function receiveDispatch(
  id: string,
  quantityReceived: number,
  profileId: string,
  branchIds: string[] | "all",
) {
  const result = await db.query<InventoryDispatch>(
    `update public.inventory_dispatches d set status='received', quantity_received=$2,
    received_at=now(), received_by=$3 where d.id=$1::uuid and d.status='in_transit' and ($4::boolean or d.to_branch_id=any($5::uuid[])) returning ${dispatchColumns}`,
    [
      id,
      quantityReceived,
      profileId,
      branchIds === "all",
      branchIds === "all" ? [] : branchIds,
    ],
  );
  return result.rows[0] ?? null;
}

export async function deleteDispatch(id: string) {
  const result = await db.query<{ id: string }>(
    `delete from public.inventory_dispatches where id = $1::uuid returning id::text`,
    [id],
  );
  return result.rows[0] ?? null;
}

const requestColumns = `r.id::text as "id", r.branch_id::text as "branchId", b.name as "branchName",
 coalesce(p.full_name,p.username) as "requestedBy", r.requested_at::text as "requestedAt",
 r.due_date::text as "dueDate", r.note, r.completed_at::text as "completedAt", coalesce(cp.full_name,cp.username) as "completedBy"`;
export async function listCountRequests(
  branchIds: string[] | "all",
  pendingOnly = false,
) {
  const result = await db.query<InventoryCountRequest>(
    `select ${requestColumns} from public.inventory_count_requests r
    join public.inventory_branches b on b.id=r.branch_id join public.profiles p on p.id=r.requested_by
    left join public.profiles cp on cp.id=r.completed_by where ($1::boolean or r.branch_id=any($2::uuid[]))
    and ($3::boolean=false or r.completed_at is null) order by r.requested_at desc limit 500`,
    [branchIds === "all", branchIds === "all" ? [] : branchIds, pendingOnly],
  );
  return result.rows;
}
export async function createCountRequest(
  branchId: string,
  dueDate: string | null,
  note: string | null,
  requestedBy: string,
  isDemo: boolean,
) {
  const result = await db.query<{ id: string }>(
    `insert into public.inventory_count_requests(branch_id,due_date,note,requested_by) values($1,$2,$3,$4) returning id::text`,
    [branchId, dueDate, demoDescription(isDemo, note), requestedBy],
  );
  return result.rows[0].id;
}
export async function completeCountRequest(
  id: string,
  branchIds: string[] | "all",
  completedBy: string,
) {
  const result = await db.query<InventoryCountRequest>(
    `update public.inventory_count_requests r set completed_at=now(),completed_by=$2 where r.id=$1::uuid and r.completed_at is null and ($3::boolean or r.branch_id=any($4::uuid[])) returning ${requestColumns}`,
    [
      id,
      completedBy,
      branchIds === "all",
      branchIds === "all" ? [] : branchIds,
    ],
  );
  return result.rows[0] ?? null;
}

export async function deleteCountRequest(id: string) {
  const result = await db.query<{ id: string }>(
    `delete from public.inventory_count_requests where id = $1::uuid returning id::text`,
    [id],
  );
  return result.rows[0] ?? null;
}
export async function reconciliation(
  month: string,
  branchIds: string[] | "all",
  materialId?: string,
) {
  const result = await db.query<InventoryReconciliation>(
    `with params as (select $1::date as first_day, ($1::date + interval '1 month')::date as next_day), scope as (
    select b.id as branch_id,b.name as branch_name,m.id as material_id,m.name as material_name,m.unit from public.inventory_branches b cross join public.inventory_materials m where b.is_active and m.is_active and ($2::boolean or b.id=any($3::uuid[])) and ($4::uuid is null or m.id=$4)
  ), figures as (select s.*, (select c.quantity from public.inventory_counts c,params where c.branch_id=s.branch_id and c.material_id=s.material_id and c.count_date < params.first_day order by c.count_date desc limit 1) as opening,
    (select coalesce(sum(d.quantity_received),0) from public.inventory_dispatches d,params where d.to_branch_id=s.branch_id and d.material_id=s.material_id and d.status='received' and d.received_at >= params.first_day and d.received_at < params.next_day) as received,
    (select coalesce(sum(d.quantity_sent),0) from public.inventory_dispatches d,params where d.from_branch_id=s.branch_id and d.material_id=s.material_id and d.dispatched_at >= params.first_day and d.dispatched_at < params.next_day) as sent,
    (select c.quantity from public.inventory_counts c,params where c.branch_id=s.branch_id and c.material_id=s.material_id and c.count_date < params.next_day order by c.count_date desc limit 1) as closing from scope s) select branch_id::text as "branchId",branch_name as "branchName",material_id::text as "materialId",material_name as "materialName",unit, $1 as month,opening,received,sent,closing,case when opening is not null and closing is not null then opening+received-sent-closing else null end as used from figures order by branch_name,material_name`,
    [
      month,
      branchIds === "all",
      branchIds === "all" ? [] : branchIds,
      materialId ?? null,
    ],
  );
  return result.rows;
}
