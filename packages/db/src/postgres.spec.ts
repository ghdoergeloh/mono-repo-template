import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PostgresTestDatabase } from "./testing";
import { createPostgresTestDatabase } from "./testing";

/**
 * Tests against a real PostgreSQL server. PGlite has one connection, so
 * locks and parallel transactions need this. CI sets `TEST_DATABASE_URL`;
 * locally, `docker compose up -d postgres` and set it to the admin URL,
 * e.g. `postgresql://postgres:postgres@localhost:5432/postgres`.
 */
const adminUrl = process.env["TEST_DATABASE_URL"];

describe.skipIf(!adminUrl)("real PostgreSQL (TEST_DATABASE_URL)", () => {
  let database: PostgresTestDatabase;

  beforeAll(async () => {
    database = await createPostgresTestDatabase(adminUrl ?? "");
  });

  afterAll(async () => {
    await database.close();
  });

  it("holds a lock across connections", async () => {
    const first = await database.pool.connect();
    const second = await database.pool.connect();
    try {
      await first.query("select pg_advisory_lock(42)");
      const { rows } = await second.query<{ locked: boolean }>(
        "select pg_try_advisory_lock(42) as locked",
      );
      expect(rows[0]?.locked).toBe(false);
    } finally {
      await first.query("select pg_advisory_unlock(42)");
      first.release();
      second.release();
    }
  });
});
