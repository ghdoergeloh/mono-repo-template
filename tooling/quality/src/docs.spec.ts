import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const docs = path.resolve(import.meta.dirname, "../../../docs");

/** Decision files are `NNNN-words.md`; 0000 is the template. */
const decisionFile = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

describe("docs", () => {
  it("keeps the status file short enough to read in full", () => {
    const status = path.join(docs, "status.md");
    expect(existsSync(status)).toBe(true);
    const lines = readFileSync(status, "utf8").trimEnd().split("\n");
    expect(lines.length).toBeLessThanOrEqual(50);
  });

  it("names every decision file NNNN-words.md", () => {
    const wrong = readdirSync(path.join(docs, "decisions")).filter(
      (file) => file !== "README.md" && !decisionFile.test(file),
    );
    expect(wrong).toEqual([]);
  });

  it("gives every decision its own number", () => {
    const numbers = readdirSync(path.join(docs, "decisions"))
      .map((file) => decisionFile.exec(file)?.[1])
      .filter((n): n is string => n !== undefined);
    const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);
    expect(duplicates).toEqual([]);
  });
});
