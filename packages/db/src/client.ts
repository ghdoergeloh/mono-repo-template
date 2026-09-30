import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema/index.js";

/**
 * A database with the app schema, independent of the driver: node-postgres
 * in the app, PGlite in tests (see `@repo/db/testing`). Services and
 * handlers take this type.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

/** A connection pool and the database on top of it. */
export interface DatabaseConnection {
  db: Database;
  /** Resolves when the database answers a query, e.g. for `/ready`. */
  ping(): Promise<void>;
  /** Closes all connections of the pool. */
  close(): Promise<void>;
}

/**
 * Creates a connection pool for `url`. The pool connects on the first query,
 * so creating it never fails and needs no running database.
 */
export function createDatabase(
  url: string,
  options: { maxConnections?: number } = {},
): DatabaseConnection {
  const pool = new pg.Pool({
    connectionString: url,
    max: options.maxConnections ?? 10,
    // Without a limit, a request or /ready waits until the operating system
    // gives up on an unreachable database.
    connectionTimeoutMillis: 5000,
  });
  const db = drizzle({ client: pool, schema });
  return {
    db,
    ping: async () => {
      await db.execute(sql`select 1`);
    },
    close: () => pool.end(),
  };
}
