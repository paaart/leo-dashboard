begin;

-- The application authenticates users with Supabase Auth. Browser clients use
-- the authenticated JWT; server routes use the service role or Postgres.
-- Anonymous Data API access must not reach business tables.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- This compatibility index was created redundantly by the payment-batch code;
-- the canonical unique constraint already covers the same columns.
drop index if exists public.vehicle_expense_payment_allocations_batch_invoice_uidx;

do $$
declare
  table_record record;
begin
  for table_record in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  loop
    execute format(
      'alter table public.%I enable row level security',
      table_record.relname
    );

    execute format(
      'drop policy if exists authenticated_app_access on public.%I',
      table_record.relname
    );

    execute format(
      'create policy authenticated_app_access on public.%I
       for all to authenticated
       using (true)
       with check (true)',
      table_record.relname
    );
  end loop;
end;
$$;

commit;
