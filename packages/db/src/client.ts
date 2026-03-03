import "dotenv/config";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema/index.js";

export type Db = NodePgDatabase<typeof schema> & { close(): Promise<void> };

interface Connection {
  pool: pg.Pool;
  db: NodePgDatabase<typeof schema>;
}

function createDb(): Connection {
  if (!process.env["TT_DATABASE_URL"]) {
    throw new Error("TT_DATABASE_URL is not set");
  }
  const pool = new pg.Pool({
    connectionString: process.env["TT_DATABASE_URL"],
  });
  return {
    pool,
    db: drizzle({
      client: pool,
      schema,
    }),
  };
}

let _connection: Connection | undefined;

function getDb(): NodePgDatabase<typeof schema> {
  _connection ??= createDb();
  return _connection.db;
}

export const db: Db = new Proxy<Db>({} as Db, {
  get(_target, prop: keyof Db | "close") {
    if (prop === "close") {
      return async () => {
        await _connection?.pool.end();
        _connection = undefined;
      };
    }
    return getDb()[prop];
  },
});

export default db;
