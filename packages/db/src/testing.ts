import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import pg from "pg";

import type { Database } from "./client.js";
import { migrationsFolder } from "./migrate.js";
import * as schema from "./schema/index.js";

/** An in-memory PostgreSQL (PGlite) with all migrations applied. */
export interface TestDatabase {
  db: Database;
  /** Raw SQL access, e.g. for constraint tests. */
  pg: PGlite;
  close(): Promise<void>;
}

function wrap(client: PGlite): TestDatabase {
  return {
    db: drizzle({ client, schema }),
    pg: client,
    close: () => client.close(),
  };
}

/** The migrated database of this test file, the source of every clone. */
let migrated: Promise<PGlite> | undefined;

async function migrateNew(): Promise<PGlite> {
  const client = new PGlite();
  await migrate(drizzle({ client, schema }), {
    migrationsFolder: migrationsFolder(),
  });
  return client;
}

/**
 * A fresh in-memory database for fast tests. Every call is isolated: the
 * migrations run once per test file, and each call gets a copy.
 *
 * PGlite has one connection. For locks, parallel transactions and other
 * real concurrency, use {@link createPostgresTestDatabase}.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  migrated ??= migrateNew();
  // clone() is typed as the interface; the copy is a PGlite like its source.
  return wrap((await (await migrated).clone()) as PGlite);
}

/** A database on a real PostgreSQL server, dropped again on close. */
export interface PostgresTestDatabase {
  db: Database;
  /** The pool, e.g. to hold two connections at the same time. */
  pool: pg.Pool;
  close(): Promise<void>;
}

/**
 * A fresh, migrated database on a real PostgreSQL server, for tests that need
 * real concurrency. `adminUrl` points to any database of a server where the
 * user may create databases; CI sets `TEST_DATABASE_URL` for this.
 */
export async function createPostgresTestDatabase(
  adminUrl: string,
): Promise<PostgresTestDatabase> {
  const name = `test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`create database ${name}`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString(), max: 10 });
  let closing = false;
  // The forced drop below can end a connection that the pool is still
  // closing; the pool reports that as an error. Any other error stays one.
  pool.on("error", (error) => {
    if (!closing) throw error;
  });
  const db = drizzlePg({ client: pool, schema });
  await migratePg(db, { migrationsFolder: migrationsFolder() });
  return {
    db,
    pool,
    close: async () => {
      closing = true;
      await pool.end();
      await admin.query(`drop database if exists ${name} with (force)`);
      await admin.end();
    },
  };
}
