import { Command } from "commander";

import type { DatabaseConnection } from "@repo/db/client";
import { greet } from "@repo/core";
import { createDatabase } from "@repo/db/client";
import { migrateDatabase } from "@repo/db/migrate";

/** What the commands print and which database they use; tests replace it. */
export interface CliDeps {
  log: (line: string) => void;
  /** `DATABASE_URL` of the process. */
  databaseUrl: () => string | undefined;
  /** Opens the database; every command closes it again, also on errors. */
  connect: (url: string) => DatabaseConnection;
  migrate: (connection: DatabaseConnection) => Promise<void>;
}

const defaultDeps: CliDeps = {
  log: (line) => console.log(line),
  databaseUrl: () => process.env["DATABASE_URL"],
  connect: (url) => createDatabase(url, { maxConnections: 1 }),
  migrate: migrateDatabase,
};

/** The CLI with all its commands. */
export function createProgram(deps: CliDeps = defaultDeps): Command {
  const program = new Command().name("cli");

  program
    .command("hello")
    .description("Print a greeting")
    .argument("[name]", "who to greet")
    .action((name?: string) => {
      deps.log(greet(name));
    });

  program
    .command("migrate")
    .description("Apply all pending database migrations (DATABASE_URL)")
    .action(async () => {
      const url = deps.databaseUrl();
      if (!url) throw new Error("DATABASE_URL is not set");
      const connection = deps.connect(url);
      try {
        await deps.migrate(connection);
        deps.log("Migrations applied");
      } finally {
        await connection.close();
      }
    });

  return program;
}
