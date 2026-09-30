import { describe, expect, it } from "vitest";

import { readSources } from "./sources";

/** Sizes for side lines: hints, meta data, values next to a label. */
const smallSize = /\btext-(?:sm|xs)\b/;

/**
 * The opening tag that starts at `start`, up to the `>` outside of braces
 * and quotes, so `className={cn("…", x)}` and `{a > b}` stay inside.
 */
function openingTag(source: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth++;
    else if (char === "}") depth--;
    else if (char === ">" && depth === 0) return source.slice(start, i + 1);
  }
  return source.slice(start);
}

/** Paragraphs in `text-muted-foreground` at body size, as "path:line tag". */
function findings(path: string, source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/<p[\s>]/g)) {
    const tag = openingTag(source, match.index);
    if (/\btext-muted-foreground\b/.test(tag) && !smallSize.test(tag)) {
      const line = source.slice(0, match.index).split("\n").length;
      found.push(`${path}:${line} ${tag.replace(/\s+/g, " ")}`);
    }
  }
  return found;
}

/**
 * `muted-foreground` is for side lines in a small size, never for running
 * text: it has the lowest contrast of all text tokens. Other elements than
 * `<p>` are left to review.
 */
describe("running text is never in muted-foreground", () => {
  const sources = readSources("**/*.tsx", ["**/*.spec.tsx"]);

  it("finds component files", () => {
    expect(sources.map(([path]) => path)).toContain("routes/login.tsx");
  });

  it("has no paragraph in text-muted-foreground at body size", () => {
    expect(sources.flatMap(([path, source]) => findings(path, source))).toEqual(
      [],
    );
  });

  it.each([
    ['<p className="text-muted-foreground">Text.</p>', true],
    ['<p\n  className="m-0 text-muted-foreground"\n>', true],
    ["<p className={`text-muted-foreground ${x ? 'a' : 'b'}`}>", true],
    ['<p className="text-muted-foreground text-sm">', false],
    ['<p className="text-xs text-muted-foreground">', false],
    ['<p className="text-foreground">', false],
    ["<p>", false],
    ['<pre className="text-muted-foreground">', false],
    ['<span className="text-muted-foreground">–</span>', false],
  ])("detects %s: %s", (source, expected) => {
    expect(findings("x.tsx", source).length > 0).toBe(expected);
  });
});
