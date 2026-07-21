create table if not exists public.warehouse_payment_alert_dismissals (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null,
  next_payment_date date not null,
  dismissed_by uuid null,
  dismissed_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (pod_id, next_payment_date)
);
