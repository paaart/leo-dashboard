# Supabase migrations

This project keeps database changes in `supabase/migrations` so they can be applied through the Supabase CLI instead of ad-hoc SQL in application code.

## Prerequisites

Install the Supabase CLI using one of the official installation methods, or run the scripts through `npx supabase@latest` if your environment permits downloading packages.

Link the repository to a Supabase project before pushing remote migrations:

```bash
supabase link --project-ref <project-ref>
```

## Common commands

```bash
npm run db:start    # start the local Supabase stack
npm run db:reset    # recreate the local DB and apply all migrations
npm run db:migrate  # apply pending migrations to the local DB
npm run db:diff     # generate a schema diff for a new migration
npm run db:push     # push local migrations to the linked remote project
npm run db:stop     # stop the local Supabase stack
```

## Current migrations

- `202607210001_create_warehouse_payment_alert_dismissals.sql` creates the table used to persist dismissed warehouse payment alerts.
