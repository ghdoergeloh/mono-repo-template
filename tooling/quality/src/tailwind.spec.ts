import { globSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { root } from "./scripts";

/**
 * packages/ui/src/lib/tw.ts builds tv and twMerge with the merge rules for
 * Tailwind 4. Any other entry of tailwind-variants (the default one, /lite,
 * /merge, /config) brings back the built-in rules, which drop a leading-*
 * next to a later font size. Screens in apps/react use the components of
 * packages/ui and need no tailwind-variants at all.
 */

const sources = globSync(
  ["packages/ui/src/**/*.{ts,tsx}", "apps/react/src/**/*.{ts,tsx}"],
  { cwd: root },
).filter(
  // Screenshot folders carry the name of their test file.
  (file) =>
    file !== "packages/ui/src/lib/tw.ts" &&
    statSync(path.join(root, file)).isFile(),
);

/** True when the source imports any entry of tailwind-variants. */
function importsTailwindVariants(source: string): boolean {
  return /(from\s+|import\s*\(\s*)["']tailwind-variants(\/[^"']*)?["']/.test(
    source,
  );
}

describe("importsTailwindVariants", () => {
  it.each([
    'import { tv } from "tailwind-variants";',
    "import { twMerge } from 'tailwind-variants/merge';",
    'const { tv } = await import("tailwind-variants");',
    "const lite = await import( 'tailwind-variants/lite' );",
  ])("finds %s", (source) => {
    expect(importsTailwindVariants(source)).toBe(true);
  });

  it.each([
    'import { tv } from "./lib/tw";',
    'const tw = await import("@repo/ui/lib/tw");',
  ])("ignores %s", (source) => {
    expect(importsTailwindVariants(source)).toBe(false);
  });
});

describe("imports of tailwind-variants", () => {
  it("finds the sources", () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it("come only from packages/ui/src/lib/tw.ts", () => {
    const offenders = sources.filter((file) =>
      importsTailwindVariants(readFileSync(path.join(root, file), "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
