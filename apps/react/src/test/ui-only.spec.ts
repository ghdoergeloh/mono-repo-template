import { describe, expect, it } from "vitest";

import { readSources } from "./sources";

/**
 * Values of `react-aria-components` the app may import, per file, e.g.
 * providers for the locale or the router. Everything else comes from
 * `@repo/ui`; type imports are always allowed.
 */
const allowedValues: Record<string, readonly string[]> = {};

/** Elements the app must not render itself; `@repo/ui` has a component for each. */
const rawElement = /<(?:button|input|select|textarea)\b|<a(?:[\s>]|$)/;

const racImport =
  /import\s+(type\s+)?([^;]*?)\s+from\s+["']react-aria-components["']/g;

/** The value names an import statement brings in, without `type` ones. */
function valueNames(clause: string): string[] {
  const named = /\{([^}]*)\}/.exec(clause);
  const rest = clause
    .replace(/\{[^}]*\}/, "")
    .replace(/,/g, " ")
    .trim();
  const names = rest ? [rest] : [];
  for (const part of named?.[1]?.split(",") ?? []) {
    const name = part.trim();
    if (name && !name.startsWith("type ")) names.push(name);
  }
  return names;
}

/** Problems of one source file, as "path:line text". */
function findings(path: string, source: string): string[] {
  const found: string[] = [];
  source.split("\n").forEach((line, i) => {
    if (rawElement.test(line))
      found.push(`${path}:${i + 1} raw element: ${line.trim()}`);
  });
  for (const match of source.matchAll(racImport)) {
    if (match[1]) continue;
    const allowed = allowedValues[path] ?? [];
    const names = valueNames(match[2] ?? "").filter(
      (name) => !allowed.includes(name),
    );
    if (names.length > 0)
      found.push(
        `${path} imports ${names.join(", ")} from react-aria-components`,
      );
  }
  return found;
}

/**
 * Screens are built from `@repo/ui` only. When several people or agents
 * build screens at the same time, this keeps one look, and the components
 * bring their states, labels and tests along. A missing component goes
 * into `packages/ui` first, with a story.
 */
describe("the app builds its screens from @repo/ui only", () => {
  // This file holds the patterns as test data.
  const sources = readSources("**/*.{ts,tsx}", [
    "routeTree.gen.ts",
    "test/ui-only.spec.ts",
  ]);

  it("finds source files", () => {
    expect(sources.map(([path]) => path)).toContain("routes/__root.tsx");
  });

  it("renders no raw controls and imports no React Aria components", () => {
    expect(sources.flatMap(([path, source]) => findings(path, source))).toEqual(
      [],
    );
  });

  it.each([
    ['<button type="button">', true],
    ["<input value={x} />", true],
    ["<select>", true],
    ["<textarea", true],
    ['<a href="#content">', true],
    ["      <a", true],
    ["<Button onPress={go}>", false],
    ["<abbr title='x'>", false],
    ["<aside>", false],
    ["Array<string>", false],
  ])("detects %s: %s", (line, expected) => {
    expect(findings("x.tsx", line).length > 0).toBe(expected);
  });

  it.each([
    ['import { Button } from "react-aria-components";', ["Button"]],
    [
      'import {\n  type Key,\n  Tabs,\n} from "react-aria-components";',
      ["Tabs"],
    ],
    ['import type { Key } from "react-aria-components";', []],
    ['import * as RAC from "react-aria-components";', ["* as RAC"]],
    ['import { useDateFormatter } from "react-aria";', []],
  ])("checks the import %s", (source, names) => {
    expect(findings("x.tsx", source)).toEqual(
      names.length > 0
        ? [`x.tsx imports ${names.join(", ")} from react-aria-components`]
        : [],
    );
  });
});
