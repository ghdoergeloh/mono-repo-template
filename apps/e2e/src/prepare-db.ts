/**
 * Creates the e2e database from scratch and applies the migrations. Runs
 * before the API starts (see `playwright.config.ts`). It only ever drops
 * the database named in `E2E_DATABASE`, which must contain `_e2e`.
 */
import pg from "pg";

import { createDatabase } from "@repo/db/client";
import { migrateDatabase } from "@repo/db/migrate";

import {
  ADMIN_DATABASE_URL,
  assertThrowaway,
  E2E_DATABASE,
  e2eDatabaseUrl,
} from "./env";

assertThrowaway(E2E_DATABASE);

const admin = new pg.Client({ connectionString: ADMIN_DATABASE_URL });
await admin.connect();
await admin.query(`drop database if exists "${E2E_DATABASE}" with (force)`);
await admin.query(`create database "${E2E_DATABASE}"`);
await admin.end();

const connection = createDatabase(e2eDatabaseUrl(), { maxConnections: 1 });
await migrateDatabase(connection);
await connection.close();
console.log(`e2e database ${E2E_DATABASE} is ready`);
