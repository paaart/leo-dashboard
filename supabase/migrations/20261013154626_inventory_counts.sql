begin;

-- These tables are accessed only by guarded Next.js routes using the server DB
-- connection. In particular, assignments must not be writable via the Data API.
revoke all on public.inventory_branches, public.inventory_materials,
  public.inventory_branch_assignments from anon, authenticated;

create table public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.inventory_branches(id),
  material_id uuid not null references public.inventory_materials(id),
  count_date date not null check (count_date >= date '2026-08-31'),
  quantity integer not null check (quantity >= 0),
  version integer not null default 1 check (version > 0),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (branch_id, material_id, count_date)
);
create index inventory_counts_latest_idx
  on public.inventory_counts (branch_id, material_id, count_date desc);

create table public.inventory_count_edits (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.inventory_counts(id),
  old_quantity integer,
  new_quantity integer not null check (new_quantity >= 0),
  edited_by uuid not null references public.profiles(id),
  edited_at timestamptz not null default now(),
  version integer not null,
  unique (count_id, version)
);

-- Audit at the database boundary so every successful write has an edit record.
create function public.audit_inventory_count() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.inventory_count_edits
    (count_id, old_quantity, new_quantity, edited_by, version)
  values (new.id, case when TG_OP = 'UPDATE' then old.quantity else null end,
    new.quantity, new.updated_by, new.version);
  return new;
end;
$$;
revoke all on function public.audit_inventory_count() from public;
create trigger inventory_count_audit after insert or update on public.inventory_counts
  for each row execute function public.audit_inventory_count();

alter table public.inventory_counts enable row level security;
alter table public.inventory_count_edits enable row level security;
revoke all on public.inventory_counts, public.inventory_count_edits from anon, authenticated;
-- No Data API policies: access is through the server-only pg connection.
commit;
