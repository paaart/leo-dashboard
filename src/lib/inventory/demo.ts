import { db } from "@/lib/db";

export function demoDescription(
  isDemo: boolean,
  value: string | null | undefined,
) {
  if (!isDemo) return value ?? null;
  const text = value?.trim() ?? "";
  return text.toLowerCase().startsWith("[demo]")
    ? text
    : `[demo]${text ? ` ${text}` : ""}`;
}

export type DemoDeleteResult = {
  counts: number;
  purchases: number;
  dispatches: number;
  countRequests: number;
  vendors: number;
  invoicePaths: string[];
};

export async function deleteDemoInventoryData(): Promise<DemoDeleteResult> {
  const client = await db.connect();
  try {
    await client.query("begin");
    const edits = await client.query(
      `delete from public.inventory_count_edits
       where count_id in (
         select c.id from public.inventory_counts c
         join public.profiles p on p.id=c.updated_by
         where lower(p.username)='test'
       )
       returning id`,
    );
    const counts = await client.query(
      `delete from public.inventory_counts c
       using public.profiles p
       where p.id=c.updated_by and lower(p.username)='test'
       returning c.id`,
    );
    const purchases = await client.query<{ invoicePath: string | null }>(
      `delete from public.inventory_purchases p
       using public.profiles actor
       where actor.id=p.created_by and (lower(actor.username)='test' or p.notes ilike '[demo]%')
       returning invoice_path as "invoicePath"`,
    );
    const dispatches = await client.query(
      `delete from public.inventory_dispatches d
       where d.created_by in (select id from public.profiles where lower(username)='test')
          or d.received_by in (select id from public.profiles where lower(username)='test')
          or d.notes ilike '[demo]%'
       returning d.id`,
    );
    const countRequests = await client.query(
      `delete from public.inventory_count_requests r
       where r.requested_by in (select id from public.profiles where lower(username)='test')
          or r.completed_by in (select id from public.profiles where lower(username)='test')
          or r.note ilike '[demo]%'
       returning r.id`,
    );
    const vendors = await client.query(
      `delete from public.vendors v where (v.name ilike '[demo]%' or v.notes ilike '[demo]%')
       and not exists (select 1 from public.inventory_purchases p where p.vendor_id=v.id)
       returning v.id`,
    );
    await client.query("commit");
    return {
      counts: counts.rowCount ?? 0,
      purchases: purchases.rowCount ?? 0,
      dispatches: dispatches.rowCount ?? 0,
      countRequests: countRequests.rowCount ?? 0,
      vendors: vendors.rowCount ?? 0,
      invoicePaths: purchases.rows
        .map((row) => row.invoicePath)
        .filter((path): path is string => Boolean(path)),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
