import { globSync, readFileSync } from "node:fs";
import path from "node:path";

const src = path.resolve(import.meta.dirname, "..");

/**
 * Source files of the app as `[path relative to src, text]`. Read from disk
 * on purpose: importing them with `?raw` would make the coverage report
 * count them as empty files and skip them.
 */
export function readSources(
  pattern: string,
  exclude: string[] = [],
): (readonly [string, string])[] {
  return globSync(pattern, { cwd: src, exclude })
    .sort()
    .map(
      (file) =>
        [
          file.split(path.sep).join("/"),
          readFileSync(path.join(src, file), "utf8"),
        ] as const,
    );
}
