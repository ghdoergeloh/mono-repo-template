import { describe, expect, it, vi } from "vitest";

import type { DatabaseConnection } from "@repo/db/client";

import type { CliDeps } from "./program";
import { createProgram } from "./program";

/** A connection that records whether it was closed. */
function fakeConnection() {
  const state = { closed: false };
  const connection = {
    db: {} as DatabaseConnection["db"],
    ping: () => Promise.resolve(),
    close: () => {
      state.closed = true;
      return Promise.resolve();
    },
  } satisfies DatabaseConnection;
  return { connection, state };
}

function run(args: string[], deps: Partial<CliDeps> = {}) {
  const lines: string[] = [];
  const program = createProgram({
    log: (line) => lines.push(line),
    databaseUrl: () => "postgresql://unused@localhost/unused",
    connect: () => fakeConnection().connection,
    migrate: () => Promise.resolve(),
    ...deps,
  });
  program.exitOverride();
  return { lines, done: program.parseAsync(["node", "cli", ...args]) };
}

describe("cli", () => {
  it("greets by name", async () => {
    const { lines, done } = run(["hello", "Ada"]);
    await done;
    expect(lines).toEqual(["Hello, Ada!"]);
  });

  it("refuses to migrate without DATABASE_URL", async () => {
    await expect(
      run(["migrate"], { databaseUrl: () => undefined }).done,
    ).rejects.toThrow(/DATABASE_URL/);
  });

  it("prints to the console and reads DATABASE_URL by default", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubEnv("DATABASE_URL", "");
    try {
      const program = createProgram().exitOverride();
      await program.parseAsync(["node", "cli", "hello", "Ada"]);
      expect(log).toHaveBeenCalledWith("Hello, Ada!");
      await expect(
        createProgram().exitOverride().parseAsync(["node", "cli", "migrate"]),
      ).rejects.toThrow(/DATABASE_URL/);
    } finally {
      log.mockRestore();
      vi.unstubAllEnvs();
    }
  });

  it("migrates and closes the connection", async () => {
    const { connection, state } = fakeConnection();
    const { lines, done } = run(["migrate"], { connect: () => connection });
    await done;
    expect(lines).toEqual(["Migrations applied"]);
    expect(state.closed).toBe(true);
  });
});

/**
 * Every command that opens the database closes it again when it fails;
 * an open pool keeps the process from ending. A new command of that kind
 * goes into this list.
 */
const databaseCommands: {
  args: string[];
  fail: (deps: Partial<CliDeps>) => Partial<CliDeps>;
}[] = [
  {
    args: ["migrate"],
    fail: (deps) => ({
      ...deps,
      migrate: () => Promise.reject(new Error("migration failed")),
    }),
  },
];

describe.each(databaseCommands)("cli $args.0", ({ args, fail }) => {
  it("closes the connection when it fails", async () => {
    const { connection, state } = fakeConnection();
    await expect(
      run(args, fail({ connect: () => connection })).done,
    ).rejects.toThrow("migration failed");
    expect(state.closed).toBe(true);
  });
});
