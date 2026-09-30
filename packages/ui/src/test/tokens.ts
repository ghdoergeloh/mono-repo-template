import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const themePath = resolve(
  import.meta.dirname,
  "../../../../tooling/tailwind/theme.css",
);

/** The custom properties declared directly in a CSS block body. */
function variables(body: string): Map<string, string> {
  const vars = new Map<string, string>();
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    if (name && value) vars.set(name, value.trim());
  }
  return vars;
}

/** The body of the block that starts right after `start`, braces balanced. */
function blockAfter(css: string, start: number): string {
  let depth = 1;
  for (let i = start; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(start, i);
  }
  throw new Error("Unbalanced braces in theme.css");
}

export type Theme = "light" | "dark";

/**
 * The color tokens of `tooling/tailwind/theme.css` per theme: `:root` for
 * light, and `:root` with its `@variant dark` block for dark.
 */
export function readThemes(): Record<Theme, (token: string) => string> {
  const css = readFileSync(themePath, "utf8");
  const rootStart = css.indexOf(":root {");
  if (rootStart === -1) throw new Error(":root block not found");
  const root = blockAfter(css, rootStart + ":root {".length);
  const darkStart = root.indexOf("@variant dark {");
  if (darkStart === -1) throw new Error("@variant dark block not found");
  const dark = blockAfter(root, darkStart + "@variant dark {".length);
  const light = variables(root.replace(dark, ""));
  const darkVars = new Map([...light, ...variables(dark)]);
  const lookup = (vars: Map<string, string>) => (token: string) => {
    const value = vars.get(token);
    if (!value) throw new Error(`Token --${token} is not defined`);
    return value;
  };
  return { light: lookup(light), dark: lookup(darkVars) };
}
