import { existsSync, globSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { root, vitestCommands } from "./scripts";

/**
 * Test runs that do not load `tooling/vitest/no-network.ts`, with the reason.
 * The key is the config file, relative to the root, and the project name
 * (empty for a config without projects).
 */
const exceptions = new Map<string, string>([
  [
    "packages/ui/vitest.config.ts#stories",
    "runs in Chromium, where node:net does not exist; the stories load no data",
  ],
]);

interface TestOptions {
  name?: string;
  setupFiles?: string | string[];
  projects?: unknown[];
  passWithNoTests?: boolean;
  coverage?: {
    include?: string[];
    exclude?: string[];
    thresholds?: Record<string, unknown>;
  };
}

interface ConfigModule {
  default: { test?: TestOptions };
}

function setupFilesOf(test: TestOptions | undefined): string[] {
  const files = test?.setupFiles ?? [];
  return Array.isArray(files) ? files : [files];
}

/**
 * The test runs of one config: every inline project (with the setup files
 * of the root when it extends it), or the root itself. Projects given as
 * paths or globs are configs of their own and are checked on their own.
 */
function runsOf(
  config: ConfigModule["default"],
): { name: string; setupFiles: string[] }[] {
  const rootFiles = setupFilesOf(config.test);
  const projects = (config.test?.projects ?? []).filter(
    (p): p is { extends?: boolean; test?: TestOptions } =>
      typeof p === "object" && p !== null,
  );
  if ((config.test?.projects ?? []).length === 0)
    return [{ name: "", setupFiles: rootFiles }];
  return projects.map((project) => ({
    name: project.test?.name ?? "",
    setupFiles: [
      ...(project.extends === true ? rootFiles : []),
      ...setupFilesOf(project.test),
    ],
  }));
}

const configFiles = globSync(
  ["vitest.config.ts", "{apps,packages,tooling}/*/vitest*.config.{ts,mts,js}"],
  { cwd: root },
).sort();

/** The files vitest looks for, in its order, when no `--config` is given. */
const defaultConfigNames = ["vitest.config", "vite.config"].flatMap((name) =>
  [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs"].map((ext) => name + ext),
);

/**
 * The config file a vitest command in a script uses, relative to the root:
 * the file of `--config` or `-c`, else the first default config in the
 * directory of the package (or of `--root`). Vitest resolves both against
 * that directory and does not search the directories above it. Null when
 * there is no config.
 */
function configOfCommand(args: string[], packageDir: string): string | null {
  const option = (long: string, short: string): string | undefined => {
    for (const [i, arg] of args.entries()) {
      if (arg === long || arg === short) return args[i + 1];
      if (arg.startsWith(`${long}=`)) return arg.slice(long.length + 1);
    }
    return undefined;
  };
  const dir = path.resolve(root, packageDir, option("--root", "-r") ?? ".");
  const config = option("--config", "-c");
  if (config !== undefined)
    return path.relative(root, path.resolve(dir, config));
  const found = defaultConfigNames.find((name) =>
    existsSync(path.join(dir, name)),
  );
  return found ? path.relative(root, path.join(dir, found)) : null;
}

interface PackageJson {
  scripts?: Record<string, string>;
}

/** Every vitest command in the scripts of the repository's package.json files. */
const scriptRuns = globSync(
  ["package.json", "{apps,packages,tooling}/*/package.json"],
  { cwd: root },
)
  .sort()
  .flatMap((file) => {
    const { scripts = {} } = JSON.parse(
      readFileSync(path.join(root, file), "utf8"),
    ) as PackageJson;
    return Object.entries(scripts).flatMap(([name, script]) =>
      vitestCommands(script).map((args) => ({
        script: `${file}#${name}`,
        config: configOfCommand(args, path.dirname(file)),
        coverage: args.includes("--coverage"),
      })),
    );
  });

/** Test files that vitest finds in a project by default. */
const testFiles = "**/*.{test,spec}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}";

/** Folders that hold no own test files. */
const skipped = (entry: string | { name: string }) =>
  /(^|\/)(node_modules|dist|coverage)$/.test(
    typeof entry === "string" ? entry : entry.name,
  );

/**
 * The `projects` of the root config as vitest resolves them: each glob
 * gives folders (a project each, with the config found in the folder) and
 * config files.
 */
async function rootProjects(): Promise<{ dirs: string[]; files: string[] }> {
  const config = (
    (await import(path.join(root, "vitest.config.ts"))) as ConfigModule
  ).default;
  const globs = (config.test?.projects ?? []).filter(
    (p): p is string => typeof p === "string",
  );
  const matches = globSync(globs, { cwd: root }).sort();
  const isDir = (p: string) => statSync(path.join(root, p)).isDirectory();
  return {
    dirs: matches.filter(isDir),
    files: matches.filter((p) => !isDir(p)),
  };
}

/** True when a folder holds test files that vitest would run. */
function hasTestFiles(dir: string): boolean {
  return (
    globSync(testFiles, { cwd: path.join(root, dir), exclude: skipped })
      .length > 0
  );
}

describe("every vitest config blocks the network", () => {
  it("finds the configs of the repository", () => {
    expect(configFiles).toContain("packages/ui/vitest.config.ts");
    expect(configFiles).toContain("packages/core/vitest.config.ts");
    expect(configFiles.length).toBeGreaterThanOrEqual(10);
  });

  it("finds the vitest scripts of the repository", () => {
    expect(scriptRuns).toContainEqual({
      script: "packages/core/package.json#test:unit:coverage",
      config: "packages/core/vitest.config.ts",
      coverage: true,
    });
    expect(scriptRuns).toContainEqual({
      script: "package.json#test",
      config: "vitest.config.ts",
      coverage: false,
    });
  });

  it.each(scriptRuns)(
    "$script runs with a config that is checked here",
    ({ config }) => {
      expect(configFiles).toContain(config);
    },
  );

  it("runs every project of the root config with a config that is checked here", async () => {
    const { dirs, files } = await rootProjects();
    const withTests = dirs.filter(hasTestFiles);
    expect(withTests).toContain("packages/core");
    expect(withTests).toContain("apps/e2e");
    for (const dir of withTests)
      expect(configFiles, `${dir} has test files`).toContain(
        configOfCommand([], dir),
      );
    for (const file of files) expect(configFiles).toContain(file);
  });

  it.each(configFiles)(
    "%s loads tooling/vitest/no-network.ts",
    async (file) => {
      const config = ((await import(path.join(root, file))) as ConfigModule)
        .default;
      for (const run of runsOf(config)) {
        const key = run.name ? `${file}#${run.name}` : file;
        if (exceptions.has(key)) continue;
        expect(
          run.setupFiles.some((f) =>
            f.replaceAll("\\", "/").endsWith("tooling/vitest/no-network.ts"),
          ),
          `${key} has no no-network setup`,
        ).toBe(true);
      }
    },
  );

  it("reads the config of a vitest command as vitest does", () => {
    expect(vitestCommands("tsc && vitest run -c a.ts | tee log")).toEqual([
      ["run", "-c", "a.ts"],
    ]);
    expect(vitestCommands("node_modules/.bin/vitest --config=b.ts")).toEqual([
      ["--config=b.ts"],
    ]);
    expect(vitestCommands("tsc --noEmit")).toEqual([]);
    expect(
      configOfCommand(["run", "-c", "vitest.other.config.ts"], "packages/core"),
    ).toBe("packages/core/vitest.other.config.ts");
    expect(configOfCommand(["--config=../x.ts"], "packages/core")).toBe(
      "packages/x.ts",
    );
    expect(configOfCommand(["run"], "packages/ui")).toBe(
      "packages/ui/vitest.config.ts",
    );
    expect(configOfCommand(["run", "--root", "packages/ui"], ".")).toBe(
      "packages/ui/vitest.config.ts",
    );
    // No config in the package: vitest runs without one.
    expect(configOfCommand(["run"], "tooling/vitest")).toBeNull();
  });

  it("lists only exceptions that exist", async () => {
    const keys: string[] = [];
    for (const file of configFiles) {
      const config = ((await import(path.join(root, file))) as ConfigModule)
        .default;
      for (const run of runsOf(config))
        keys.push(run.name ? `${file}#${run.name}` : file);
    }
    for (const key of exceptions.keys()) expect(keys, key).toContain(key);
  });
});

/**
 * Packages whose `test:unit:coverage` runs without `--coverage`, with the
 * reason. CI runs that script, so every package has it.
 */
const withoutCoverage = new Map<string, string>([
  ["tooling/quality", "holds only checks of the workspace, no code to measure"],
  [
    "apps/e2e",
    "helpers for Playwright; their code runs in the end-to-end tests",
  ],
]);

/** Every `test:unit:coverage` script, with its package and its arguments. */
const coverageScripts = scriptRuns.filter(({ script }) =>
  script.endsWith("#test:unit:coverage"),
);

/** Configs of the vitest runs that measure coverage (`--coverage`). */
const coverageConfigs = scriptRuns
  .filter(({ coverage }) => coverage)
  .map(({ config }) => config)
  .filter((config): config is string => config !== null);

/** Source files of a package that coverage could measure. */
function sourceFiles(dir: string): string[] {
  return globSync("src/**/*.{ts,tsx}", {
    cwd: path.join(root, dir),
    exclude: skipped,
  }).filter((file) => !file.endsWith(".d.ts"));
}

/**
 * Coverage floors are fixed numbers, raised by hand. Floors with
 * `autoUpdate` rewrite the config on every run, which conflicts between
 * parallel branches and differs between machines.
 */
describe("every coverage run has fixed floors", () => {
  it("finds the coverage runs", () => {
    expect(coverageConfigs).toContain("packages/core/vitest.config.ts");
  });

  it.each(coverageScripts)(
    "$script measures coverage unless it is listed",
    ({ script, coverage }) => {
      const dir = path.dirname(script.split("#")[0] ?? "");
      if (withoutCoverage.has(dir)) return;
      expect(coverage, `${script} runs without --coverage`).toBe(true);
    },
  );

  it("lists only packages without coverage that exist and need it", () => {
    for (const dir of withoutCoverage.keys()) {
      const run = coverageScripts.find(({ script }) =>
        script.startsWith(`${dir}/package.json#`),
      );
      expect(run, dir).toBeDefined();
      expect(run?.coverage, dir).toBe(false);
    }
  });

  it.each(coverageConfigs)("%s", async (file) => {
    const config = ((await import(path.join(root, file))) as ConfigModule)
      .default;
    const thresholds = config.test?.coverage?.thresholds ?? {};
    expect(thresholds).not.toHaveProperty("autoUpdate");
    for (const metric of ["statements", "branches", "functions", "lines"])
      expect(thresholds[metric], `${file}: ${metric}`).toBeGreaterThan(0);
  });

  it.each(coverageConfigs)(
    "%s measures or excludes every source file",
    async (file) => {
      const config = ((await import(path.join(root, file))) as ConfigModule)
        .default;
      const { include = [], exclude = [] } = config.test?.coverage ?? {};
      const matches = (patterns: string[], source: string) =>
        patterns.some((pattern) => path.matchesGlob(source, pattern));
      const unmeasured = sourceFiles(path.dirname(file)).filter(
        (source) => !matches(include, source) && !matches(exclude, source),
      );
      expect(unmeasured, "neither in coverage.include nor excluded").toEqual(
        [],
      );
    },
  );
});

describe("no vitest run passes without tests", () => {
  it.each(configFiles)("%s", async (file) => {
    const config = ((await import(path.join(root, file))) as ConfigModule)
      .default;
    const lenient = [
      config.test,
      ...(config.test?.projects ?? []).map(
        (p) => (p as { test?: TestOptions } | null)?.test,
      ),
    ].filter((test) => test?.passWithNoTests === true);
    expect(lenient).toEqual([]);
  });
});
