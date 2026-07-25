import { Pool } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

const connectionString = process.env.SUPABASE_DB_URL;
// Supabase Postgres connection string. Currently the session-mode pooler
// (port 5432); session mode caps concurrent clients, so keep the per-instance
// footprint small — serverless runs many instances.

if (!connectionString) {
  throw new Error("Missing SUPABASE_DB_URL env var");
}

export const db =
  global.__pgPool ??
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
  });

global.__pgPool = db;
