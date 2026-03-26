import { Pool } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

const connectionString = process.env.SUPABASE_DB_URL;
// Use Supabase Postgres connection string (prefer "Session" mode, not pooler, for transactions)

if (!connectionString) {
  throw new Error("Missing SUPABASE_DB_URL env var");
}

export const db =
  global.__pgPool ??
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") global.__pgPool = db;
