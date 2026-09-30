import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../../../..");

/** Source folders whose code must use the semantic tokens only. */
const roots = ["packages/ui/src", "apps/react/src"];

/**
 * Files that may contain raw colors, with the reason. The color pickers
 * show any color the user picks, so their selection ring and the
 * transparency pattern need black and white.
 */
const exceptions: [RegExp, string][] = [
  [/\/ui\/Color[A-Z]\w*\.tsx$/, "color pickers show arbitrary colors"],
  [/\/raw-colors\.spec\.ts$/, "the patterns of this test"],
  [/\/routeTree\.gen\.ts$/, "generated"],
];

const palette =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white";

const rules: [string, RegExp][] = [
  ["hex color", /#[0-9a-fA-F]{3,8}\b(?![\w-])/],
  ["color function", /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color-mix)\(/],
  [
    "Tailwind palette class",
    new RegExp(
      `\\b(?:bg|text|border|fill|stroke|ring|outline|from|via|to|divide|shadow|accent|caret|decoration|placeholder)-(?:${palette})\\b`,
    ),
  ],
  ["arbitrary color class", /-\[(?:#|rgb|hsl|oklch|color:)/],
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

/** Lines that break a rule, as "path:line rule: text". */
function findings(path: string, source: string): string[] {
  return source
    .split("\n")
    .flatMap((line, i) =>
      rules
        .filter(([, pattern]) => pattern.test(line))
        .map(([rule]) => `${path}:${i + 1} ${rule}: ${line.trim()}`),
    );
}

/**
 * Components and app code use the tokens of `tooling/tailwind/theme.css`.
 * Tokens follow the dark theme and pass the contrast test; raw colors do
 * neither. Components added with `ui-add` come with palette classes.
 */
describe("no raw colors in components and app code", () => {
  const sources = roots
    .flatMap((root) => files(join(repoRoot, root)))
    .filter((path) => !exceptions.some(([pattern]) => pattern.test(path)));

  it("finds source files", () => {
    expect(sources.length).toBeGreaterThan(20);
  });

  it("uses semantic tokens only", () => {
    expect(
      sources.flatMap((path) =>
        findings(relative(repoRoot, path), readFileSync(path, "utf8")),
      ),
    ).toEqual([]);
  });

  it.each([
    ["bg-gray-100", true],
    ["hover:text-indigo-600", true],
    ["text-[#ff0000]", true],
    ["color: #fff;", true],
    ["bg-[rgb(0,0,0)]", true],
    ["oklch(0.5 0.1 20)", true],
    ["bg-black/30", true],
    ["border-white", true],
    ["bg-primary text-primary-foreground", false],
    ["bg-foreground/30", false],
    ["text-destructive", false],
    ["forced-colors:outline-[Highlight]", false],
    ["C# and C++", false],
  ])("detects %s: %s", (line, expected) => {
    expect(findings("x.tsx", line).length > 0).toBe(expected);
  });
});
