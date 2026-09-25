begin;

-- Branch staff log in only to report packaging-material stock for the branches
-- they are assigned to. They are a third role beside 'user' and 'admin'.
alter table public.profiles drop constraint if exists profiles_role_valid;
alter table public.profiles
  add constraint profiles_role_valid check (role in ('user', 'admin', 'branch'));

-- ---------------------------------------------------------------------------
-- Branches: every location that holds packaging material. Exactly one is the
-- central store (Uttarahalli) that buys from vendors and dispatches to the rest.
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_central boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint inventory_branches_name_not_blank check (btrim(name) <> '')
);

create unique index if not exists inventory_branches_name_uidx
  on public.inventory_branches (lower(btrim(name)));

-- Partial unique index: at most one row may be the central store.
create unique index if not exists inventory_branches_single_central_uidx
  on public.inventory_branches (is_central)
  where is_central;

-- ---------------------------------------------------------------------------
-- Materials: everything counted or purchased. min_stock is the company-wide
-- restock threshold used until there is enough usage history.
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'pcs',
  min_stock integer null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint inventory_materials_name_not_blank check (btrim(name) <> ''),
  constraint inventory_materials_unit_not_blank check (btrim(unit) <> ''),
  constraint inventory_materials_min_stock_nonneg check (min_stock is null or min_stock >= 0)
);

create unique index if not exists inventory_materials_name_uidx
  on public.inventory_materials (lower(btrim(name)));

-- ---------------------------------------------------------------------------
-- Which branch-role users may report stock for which branches (many-to-many).
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_branch_assignments (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.inventory_branches(id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (profile_id, branch_id)
);

create index if not exists inventory_branch_assignments_branch_idx
  on public.inventory_branch_assignments (branch_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (same shape as the profiles / fuel tracking ones)
-- ---------------------------------------------------------------------------
create or replace function public.set_inventory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_inventory_branches_updated_at on public.inventory_branches;
create trigger set_inventory_branches_updated_at
before update on public.inventory_branches
for each row execute function public.set_inventory_updated_at();

drop trigger if exists set_inventory_materials_updated_at on public.inventory_materials;
create trigger set_inventory_materials_updated_at
before update on public.inventory_materials
for each row execute function public.set_inventory_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: 20260818155239 enabled RLS + the authenticated_app_access policy on every
-- table that existed at the time. New tables have to opt in explicitly.
-- ---------------------------------------------------------------------------
alter table public.inventory_branches enable row level security;
alter table public.inventory_materials enable row level security;
alter table public.inventory_branch_assignments enable row level security;

drop policy if exists authenticated_app_access on public.inventory_branches;
create policy authenticated_app_access on public.inventory_branches
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_app_access on public.inventory_materials;
create policy authenticated_app_access on public.inventory_materials
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_app_access on public.inventory_branch_assignments;
create policy authenticated_app_access on public.inventory_branch_assignments
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Seed: the branches and materials from the client's FY 2026-27 stock sheets.
-- Idempotent so re-running the migration locally is safe.
-- ---------------------------------------------------------------------------
insert into public.inventory_branches (name, is_central, sort_order)
select v.name, v.is_central, v.sort_order
from (
  values
    ('Uttarahalli', true, 1),
    ('Peenya', false, 2),
    ('Whitefield', false, 3),
    ('Chennai', false, 4),
    ('Hyderabad', false, 5),
    ('Ahmedabad', false, 6),
    ('Mumbai', false, 7),
    ('Pune', false, 8),
    ('Gurgaon', false, 9),
    ('Kolkata', false, 10),
    ('Coimbatore', false, 11),
    ('Guwahati', false, 12)
) as v(name, is_central, sort_order)
where not exists (
  select 1 from public.inventory_branches b
  where lower(btrim(b.name)) = lower(v.name)
);

insert into public.inventory_materials (name, unit, sort_order)
select v.name, v.unit, v.sort_order
from (
  values
    ('Cartons', 'pcs', 1),
    ('Cartons - International', 'pcs', 2),
    ('TV Cartons', 'pcs', 3),
    ('Coat Boxes', 'pcs', 4),
    ('Blankets', 'pcs', 5),
    ('Drums', 'pcs', 6),
    ('Crates', 'pcs', 7),
    ('Paper Rolls', 'rolls', 8),
    ('Air Bubble Rolls', 'rolls', 9),
    ('Stretch Film Rolls', 'rolls', 10),
    ('Mattress Covers', 'pcs', 11),
    ('Cut Waste', 'pcs', 12),
    ('Patti Rolls', 'rolls', 13),
    ('Adhesive Tape', 'pcs', 14),
    ('Packing Clips', 'pcs', 15),
    ('Twine', 'pcs', 16),
    ('Polyethylene', 'pcs', 17)
) as v(name, unit, sort_order)
where not exists (
  select 1 from public.inventory_materials m
  where lower(btrim(m.name)) = lower(v.name)
);

commit;
