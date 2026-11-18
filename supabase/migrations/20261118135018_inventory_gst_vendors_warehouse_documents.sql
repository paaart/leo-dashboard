begin;

alter table public.inventory_purchases
  add column if not exists gst_amount numeric(14,2) not null default 0
    check (gst_amount >= 0);

alter table public.warehouse_pods
  add column if not exists packing_list_path text,
  add column if not exists ledger_record_path text,
  add column if not exists storage_contract_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('warehouse-pod-documents', 'warehouse-pod-documents', false, 10485760,
  array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
