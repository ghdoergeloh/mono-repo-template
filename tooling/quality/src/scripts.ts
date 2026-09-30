import path from "node:path";

/** The repository root, three levels above this file. */
export const root = path.resolve(import.meta.dirname, "../../..");

/** The arguments after `vitest` of every vitest command in a script. */
export function vitestCommands(script: string): string[][] {
  return script
    .split(/&&|\|\||[;|]/)
    .map((command) => command.trim().split(/\s+/))
    .flatMap((words) => {
      const at = words.findIndex(
        (word) => word === "vitest" || word.endsWith("/vitest"),
      );
      return at === -1 ? [] : [words.slice(at + 1)];
    });
}
