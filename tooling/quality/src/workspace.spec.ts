import { existsSync, globSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import { root, vitestCommands } from "./scripts";

/**
 * Checks that hold for every package of the workspace. Each one guards a
 * gap that stays silent otherwise: a typecheck that checks no file, a
 * package without tests that stays green, tests without the network guard.
 */

interface PackageJson {
  name: string;
  scripts?: Record<string, string>;
}

/**
 * Packages without their own tests, with the reason. They still typecheck
 * when they have a typecheck script.
 */
const withoutTests = new Map<string, string>([
  ["tooling/github", "a composite action for CI, no code"],
  ["tooling/typescript", "tsconfig files only"],
  [
    "tooling/tailwind",
    "the theme; the contrast and raw color tests of packages/ui check it",
  ],
  [
    "tooling/vitest",
    "the shared test configs and the network guard; tooling/quality tests them",
  ],
]);

/** Every app, package and tooling package of the workspace. */
const packageDirs = globSync(
  ["apps/*/package.json", "packages/*/package.json", "tooling/*/package.json"],
  { cwd: root },
)
  .map((file) => path.dirname(file))
  .sort();

function readPackage(dir: string): PackageJson {
  return JSON.parse(
    readFileSync(path.join(root, dir, "package.json"), "utf8"),
  ) as PackageJson;
}

/** Reads a tsconfig; throws when it cannot be read at all. */
function parseTsconfig(tsconfig: string): ts.ParsedCommandLine {
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
  return parsed;
}

/** The files of a tsconfig and of all projects it references. */
function filesWithReferences(tsconfig: string): string[] {
  const parsed = parseTsconfig(tsconfig);
  const references = (parsed.projectReferences ?? []).flatMap((reference) =>
    filesWithReferences(ts.resolveProjectReferencePath(reference)),
  );
  return [...parsed.fileNames, ...references];
}

/** The tsconfig one `tsc` command reads, relative to `dir`. */
function tsconfigOfTsc(command: string): string {
  const words = command.trim().split(/\s+/);
  for (const [i, word] of words.entries()) {
    if (word === "-p" || word === "--project") return words[i + 1] ?? "";
    if (word.startsWith("--project=")) return word.slice("--project=".length);
    if (
      (word === "-b" || word === "--build") &&
      words[i + 1]?.endsWith(".json")
    )
      return words[i + 1] ?? "";
  }
  return "tsconfig.json";
}

/**
 * The files one `tsc` command checks. With `-b`, the referenced projects
 * count; without it, a solution-style tsconfig (`files: []`) checks nothing.
 */
function filesOfTsc(command: string, dir: string): string[] {
  const words = command.trim().split(/\s+/);
  const tsconfig = path.join(root, dir, tsconfigOfTsc(command));
  if (words.includes("-b") || words.includes("--build"))
    return filesWithReferences(tsconfig);
  return parseTsconfig(tsconfig).fileNames;
}

/** The `tsc` commands of a typecheck script. */
function tscCommands(script: string): string[] {
  return script
    .split("&&")
    .map((command) => command.trim())
    .filter((command) => command.startsWith("tsc"));
}

describe("reading a typecheck script", () => {
  it("finds the tsconfig of each tsc command", () => {
    expect(tsconfigOfTsc("tsc --noEmit")).toBe("tsconfig.json");
    expect(tsconfigOfTsc("tsc -p tsconfig.app.json --noEmit")).toBe(
      "tsconfig.app.json",
    );
    expect(tsconfigOfTsc("tsc --project tsconfig.node.json")).toBe(
      "tsconfig.node.json",
    );
    expect(tsconfigOfTsc("tsc --noEmit --project=tsconfig.sol.json")).toBe(
      "tsconfig.sol.json",
    );
    expect(tsconfigOfTsc("tsc -b tsconfig.all.json")).toBe("tsconfig.all.json");
    expect(tsconfigOfTsc("tsc -b --noEmit")).toBe("tsconfig.json");
  });

  it("counts the referenced projects only with -b", () => {
    // apps/react/tsconfig.json is solution-style: `files: []` and references.
    expect(filesOfTsc("tsc --noEmit", "apps/react")).toEqual([]);
    expect(filesOfTsc("tsc -b --noEmit", "apps/react").length).toBeGreaterThan(
      0,
    );
  });

  it("splits a script into its tsc commands", () => {
    expect(
      tscCommands("tsc -p a.json --noEmit && tsc -p b.json --noEmit"),
    ).toEqual(["tsc -p a.json --noEmit", "tsc -p b.json --noEmit"]);
  });
});

describe("the list of packages without tests", () => {
  it("names only packages that exist", () => {
    for (const dir of withoutTests.keys()) expect(packageDirs).toContain(dir);
  });
});

describe.each(packageDirs)("%s", (dir) => {
  const pkg = readPackage(dir);
  const scripts = pkg.scripts ?? {};
  const tested = !withoutTests.has(dir);

  it.runIf(tested)("has a typecheck and a unit test script", () => {
    expect(Object.keys(scripts)).toEqual(
      expect.arrayContaining(["typecheck", "test:unit"]),
    );
  });

  it.runIf(tested)(
    "runs its tests in CI, which runs test:unit:coverage",
    () => {
      expect(Object.keys(scripts)).toContain("test:unit:coverage");
    },
  );

  it.runIf(tested)("runs vitest in its test scripts", () => {
    for (const name of ["test:unit", "test:unit:coverage"])
      expect(
        vitestCommands(scripts[name] ?? "").length,
        `${name} of ${dir} runs no vitest`,
      ).toBeGreaterThan(0);
  });

  it.runIf(tested)("has a vitest config, so the network guard applies", () => {
    expect(existsSync(path.join(root, dir, "vitest.config.ts"))).toBe(true);
  });

  it("fails when it has no tests", () => {
    const lenient = Object.entries(scripts)
      .filter(([, script]) => script.includes("--passWithNoTests"))
      .map(([name]) => name);
    expect(lenient).toEqual([]);
  });

  it.runIf(tested || scripts["typecheck"] !== undefined)(
    "typechecks real files and fails on a type error",
    () => {
      const script = scripts["typecheck"] ?? "";
      // `tsc || true` or `tsc; echo` would pass with type errors.
      expect(script, `typecheck of ${dir}`).not.toMatch(/\|\||;/);
      const commands = tscCommands(script);
      expect(commands.length).toBeGreaterThan(0);
      for (const command of commands) {
        expect(
          filesOfTsc(command, dir).filter(
            (file) => !file.includes("node_modules"),
          ).length,
          `"${command}" in ${dir} checks no file`,
        ).toBeGreaterThan(0);
      }
    },
  );
});

/**
 * `pnpm turbo gen init` scaffolds a package. The package it writes must
 * pass the checks above, so the templates are read as the generator
 * writes them.
 */
describe("the package generator", () => {
  const templates = path.join(root, "turbo/generators/templates");
  const render = (file: string) =>
    readFileSync(path.join(templates, file), "utf8").replaceAll(
      "{{ name }}",
      "example",
    );
  const config = readFileSync(
    path.join(root, "turbo/generators/config.ts"),
    "utf8",
  );

  it("writes test scripts that run vitest, with coverage in CI", () => {
    const pkg = JSON.parse(render("package.json.hbs")) as PackageJson;
    const scripts = pkg.scripts ?? {};
    expect(scripts["typecheck"]).toBe("tsc --noEmit");
    expect(vitestCommands(scripts["test:unit"] ?? "")).toEqual([["run"]]);
    expect(vitestCommands(scripts["test:unit:coverage"] ?? "")).toEqual([
      ["run", "--coverage"],
    ]);
    expect(Object.values(scripts).join(" ")).not.toContain("--passWithNoTests");
  });

  it("extends a tsconfig that exists", () => {
    const { extends: base } = JSON.parse(render("tsconfig.json.hbs")) as {
      extends: string;
    };
    expect(base.startsWith("@repo/tsconfig/")).toBe(true);
    expect(
      existsSync(
        path.join(
          root,
          "tooling/typescript",
          base.slice("@repo/tsconfig/".length),
        ),
      ),
    ).toBe(true);
  });

  it("writes a vitest config with the network guard and a first test", () => {
    expect(config).toContain('path: "packages/{{ name }}/vitest.config.ts"');
    expect(config).toContain('path: "packages/{{ name }}/src/index.spec.ts"');
    const vitestConfig = render("vitest.config.ts.hbs");
    expect(vitestConfig).toContain("viteConfig");
    expect(vitestConfig).not.toContain("autoUpdate");
  });
});
