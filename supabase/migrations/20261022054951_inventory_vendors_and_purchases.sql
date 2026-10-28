begin;

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_name_not_blank check (btrim(name) <> '')
);
create unique index vendors_name_uidx on public.vendors (lower(btrim(name)));

create table public.inventory_purchases (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.inventory_branches(id),
  material_id uuid not null references public.inventory_materials(id),
  vendor_id uuid not null references public.vendors(id),
  purchase_date date not null check (purchase_date >= date '2026-09-01'),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  invoice_path text,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inventory_purchases_date_idx on public.inventory_purchases (purchase_date desc);
create index inventory_purchases_material_date_idx on public.inventory_purchases (material_id, purchase_date desc);
create index inventory_purchases_vendor_date_idx on public.inventory_purchases (vendor_id, purchase_date desc);

create or replace function public.set_inventory_purchase_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists set_inventory_purchases_updated_at on public.inventory_purchases;
create trigger set_inventory_purchases_updated_at before update on public.inventory_purchases
for each row execute function public.set_inventory_purchase_updated_at();

alter table public.vendors enable row level security;
alter table public.inventory_purchases enable row level security;
revoke all on public.vendors, public.inventory_purchases from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inventory-invoices', 'inventory-invoices', false, 10485760,
  array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
