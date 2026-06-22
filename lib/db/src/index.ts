import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Pool sized to support parallel certificate-shard workers (each concurrent
// PDF render performs a couple of quick DB ops). Override with PGPOOL_MAX.
const POOL_MAX = Number(process.env.PGPOOL_MAX ?? 30);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number.isFinite(POOL_MAX) && POOL_MAX > 0 ? POOL_MAX : 30,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
