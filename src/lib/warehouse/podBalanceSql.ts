export const WAREHOUSE_ACTIVE_POD_BALANCE_CTES = `
  active_cycle as (
    select
      cy.id as cycle_id,
      cy.pod_id
    from public.warehouse_pod_cycles cy
    where cy.status = 'active'
  ),
  tx as (
    select
      t.cycle_id,
      t.type,
      t.amount,
      coalesce(t.gst_rate, 0) as gst_rate,
      t.tx_date
    from public.warehouse_pod_transactions t
  ),
  agg as (
    select
      ac.pod_id,

      coalesce(
        sum(
          case
            when tx.type in ('charge','adjustment')
              then tx.amount * (1 + (tx.gst_rate / 100.0))
            else 0
          end
        ),
      0)::numeric(12,2) as total_charged_gross,

      abs(
        coalesce(
          sum(case when tx.type = 'payment' then tx.amount else 0 end),
        0)
      )::numeric(12,2) as total_paid_abs,

      coalesce(
        sum(
          case
            when tx.type in ('charge','adjustment')
              then tx.amount * (1 + (tx.gst_rate / 100.0))
            else tx.amount
          end
        ),
      0)::numeric(12,2) as total_due_gross,

      max(case when tx.type in ('charge','adjustment') then tx.tx_date end) as last_charge_date,
      max(case when tx.type = 'payment' then tx.tx_date end) as last_payment_date

    from active_cycle ac
    left join tx on tx.cycle_id = ac.cycle_id
    group by ac.pod_id
  )
`;
