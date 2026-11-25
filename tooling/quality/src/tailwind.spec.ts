import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
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
 * it that way. This test runs it on a small copy of the folder layout,
 * with the installed packages of packages/ui linked in, so that every import
 * resolves the same way as in the repository. dependency-cruiser skips test
 * files; in packages/ui/src the oxlint rule covers them.
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
  for (const folder of ["packages/ui", "apps/react"]) {
    symlinkSync(
      path.join(root, "packages/ui/node_modules"),
      path.join(dir, folder, "node_modules"),
    );
  }
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

interface Violation {
  from: string;
  to: string;
  rule: { name: string };
}

/** The violations of the rule, as dependency-cruiser reports them. */
function violations(): Violation[] {
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
    summary: { violations: Violation[] };
  };
  return report.summary.violations.filter(
    (violation) => violation.rule.name === "tailwind-variants-only-in-tw",
  );
}

describe("imports of tailwind-variants", () => {
  it("are allowed only in packages/ui/src/lib/tw.ts", () => {
    const found = violations();
    // Every import resolves to the installed package, not to a bare name.
    expect(
      found.filter((violation) => !violation.to.includes("node_modules/")),
    ).toEqual([]);
    expect(found.map((violation) => violation.from).sort()).toEqual([
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
