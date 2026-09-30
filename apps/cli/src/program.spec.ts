import { describe, expect, it } from "vitest";

import { createProgram } from "./program";

function run(args: string[], databaseUrl?: string) {
  const lines: string[] = [];
  const program = createProgram({
    log: (line) => lines.push(line),
    databaseUrl: () => databaseUrl,
  });
  program.exitOverride();
  return {
    lines,
    done: program.parseAsync(["node", "cli", ...args]),
  };
}

describe("cli", () => {
  it("greets by name", async () => {
    const { lines, done } = run(["hello", "Ada"]);
    await done;
    expect(lines).toEqual(["Hello, Ada!"]);
  });

  it("refuses to migrate without DATABASE_URL", async () => {
    await expect(run(["migrate"]).done).rejects.toThrow(/DATABASE_URL/);
  });
});
