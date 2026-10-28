begin;
create table public.inventory_dispatches (
 id uuid primary key default gen_random_uuid(),
 from_branch_id uuid not null references public.inventory_branches(id),
 to_branch_id uuid not null references public.inventory_branches(id),
 material_id uuid not null references public.inventory_materials(id),
 quantity_sent integer not null check (quantity_sent > 0),
 quantity_received integer check (quantity_received is null or quantity_received >= 0),
 status text not null default 'in_transit' check (status in ('in_transit','received')),
 dispatched_at timestamptz not null default now(),
 received_at timestamptz,
 created_by uuid not null references public.profiles(id),
 received_by uuid references public.profiles(id),
 notes text,
 constraint inventory_dispatches_different_branches check (from_branch_id <> to_branch_id),
 constraint inventory_dispatches_receive_state check ((status='in_transit' and received_at is null and received_by is null and quantity_received is null) or (status='received' and received_at is not null and received_by is not null and quantity_received is not null))
);
create index inventory_dispatches_to_status_idx on public.inventory_dispatches(to_branch_id,status,dispatched_at desc);
create index inventory_dispatches_month_idx on public.inventory_dispatches(dispatched_at);
create table public.inventory_count_requests (
 id uuid primary key default gen_random_uuid(), branch_id uuid not null references public.inventory_branches(id),
 requested_by uuid not null references public.profiles(id), requested_at timestamptz not null default now(),
 due_date date, note text, completed_at timestamptz, completed_by uuid references public.profiles(id)
);
create index inventory_count_requests_pending_idx on public.inventory_count_requests(branch_id,requested_at desc) where completed_at is null;
alter table public.inventory_dispatches enable row level security;
alter table public.inventory_count_requests enable row level security;
revoke all on public.inventory_dispatches, public.inventory_count_requests from anon, authenticated;
commit;
