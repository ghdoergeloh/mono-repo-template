import { existsSync, globSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Checks that hold for every package of the workspace. Each one guards a
 * gap that stays silent otherwise: a typecheck that checks no file, a
 * package without tests that stays green, tests without the network guard.
 */

const root = path.resolve(import.meta.dirname, "../../..");

interface PackageJson {
  name: string;
  scripts?: Record<string, string>;
}

/** Packages with code: every app and package, and this one. */
const packageDirs = globSync(
  ["apps/*/package.json", "packages/*/package.json"],
  {
    cwd: root,
  },
)
  .map((file) => path.dirname(file))
  .concat("tooling/quality")
  .sort();

function readPackage(dir: string): PackageJson {
  return JSON.parse(
    readFileSync(path.join(root, dir, "package.json"), "utf8"),
  ) as PackageJson;
}

/** The files the TypeScript project of `tsconfig` checks. */
function filesOf(tsconfig: string): string[] {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    tsconfig,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        );
      },
    },
  );
  if (!parsed) throw new Error(`Cannot read ${tsconfig}`);
  const references = (parsed.projectReferences ?? []).flatMap((reference) =>
    filesOf(ts.resolveProjectReferencePath(reference)),
  );
  return [...parsed.fileNames, ...references];
}

/**
 * The files one `tsc` command checks. With `-b`, the referenced projects
 * count; without it, a solution-style tsconfig (`files: []`) checks nothing.
 */
function filesOfTsc(command: string, dir: string): string[] {
  const words = command.trim().split(/\s+/);
  const project =
    words[words.findIndex((w) => w === "-p" || w === "--project") + 1];
  const tsconfig = path.join(
    root,
    dir,
    words.includes("-p") || words.includes("--project")
      ? (project ?? "")
      : "tsconfig.json",
  );
  if (words.includes("-b") || words.includes("--build"))
    return filesOf(tsconfig);
  const parsed = ts.getParsedCommandLineOfConfigFile(
    tsconfig,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  );
  return parsed?.fileNames ?? [];
}

describe.each(packageDirs)("%s", (dir) => {
  const pkg = readPackage(dir);
  const scripts = pkg.scripts ?? {};

  it("has a typecheck and a unit test script", () => {
    expect(Object.keys(scripts)).toEqual(
      expect.arrayContaining(["typecheck", "test:unit"]),
    );
  });

  it("runs its tests in CI, which runs test:unit:coverage", () => {
    expect(Object.keys(scripts)).toContain("test:unit:coverage");
  });

  it("has a vitest config, so the network guard applies", () => {
    expect(existsSync(path.join(root, dir, "vitest.config.ts"))).toBe(true);
  });

  it("fails when it has no tests", () => {
    const lenient = Object.entries(scripts)
      .filter(([, script]) => script.includes("--passWithNoTests"))
      .map(([name]) => name);
    expect(lenient).toEqual([]);
  });

  it("typechecks real files", () => {
    const commands = (scripts["typecheck"] ?? "")
      .split("&&")
      .filter((command) => command.trim().startsWith("tsc"));
    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) {
      expect(
        filesOfTsc(command, dir).filter(
          (file) => !file.includes("node_modules"),
        ).length,
        `"${command.trim()}" in ${dir} checks no file`,
      ).toBeGreaterThan(0);
    }
  });
});
