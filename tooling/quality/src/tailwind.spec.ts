import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { root } from "./scripts";

/**
 * packages/ui/src/lib/tw.ts builds tv and twMerge with the merge rules for
 * Tailwind 4. Any other entry of tailwind-variants (the default one, /lite,
 * /merge, /config) brings back the built-in rules, which drop a leading-*
 * next to a later font size. Screens in apps/react use the components of
 * packages/ui and need no tailwind-variants at all.
 *
 * The rule "tailwind-variants-only-in-tw" in .dependency-cruiser.cjs keeps
 * it that way. This test runs it on a small copy of the folder layout.
 */

const files: Record<string, string> = {
  "packages/ui/src/lib/tw.ts": 'export { tv } from "tailwind-variants";\n',
  "packages/ui/src/static.ts": 'export { tv } from "tailwind-variants";\n',
  "packages/ui/src/entry.ts":
    'export { twMerge } from "tailwind-variants/merge";\n',
  "packages/ui/src/side-effect.ts": 'import "tailwind-variants";\n',
  "packages/ui/src/dynamic.ts":
    'export const load = () => import("tailwind-variants/lite");\n',
  "packages/ui/src/template.ts":
    "export const load = () => import(`tailwind-variants`);\n",
  "packages/ui/src/required.cjs": 'require("tailwind-variants");\n',
  "packages/ui/src/allowed.ts": 'export { tv } from "./lib/tw";\n',
  "apps/react/src/screen.ts": 'export { tv } from "tailwind-variants";\n',
};

let dir = "";

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "tw-rule-"));
  for (const [file, source] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), source);
  }
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** The files that break the rule, as dependency-cruiser reports them. */
function offenders(): string[] {
  const result = spawnSync(
    path.join(root, "node_modules/.bin/depcruise"),
    [
      "apps",
      "packages",
      "--config",
      path.join(root, ".dependency-cruiser.cjs"),
      "--output-type",
      "json",
    ],
    { cwd: dir, encoding: "utf8" },
  );
  const report = JSON.parse(result.stdout) as {
    summary: { violations: { from: string; rule: { name: string } }[] };
  };
  return report.summary.violations
    .filter(
      (violation) => violation.rule.name === "tailwind-variants-only-in-tw",
    )
    .map((violation) => violation.from)
    .sort();
}

describe("imports of tailwind-variants", () => {
  it("are allowed only in packages/ui/src/lib/tw.ts", () => {
    expect(offenders()).toEqual([
      "apps/react/src/screen.ts",
      "packages/ui/src/dynamic.ts",
      "packages/ui/src/entry.ts",
      "packages/ui/src/required.cjs",
      "packages/ui/src/side-effect.ts",
      "packages/ui/src/static.ts",
      "packages/ui/src/template.ts",
    ]);
  });
});
