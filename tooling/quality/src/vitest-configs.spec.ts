import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Every unit test run loads the network guard (`tooling/vitest/no-network.ts`)
 * and has fixed coverage floors. Floors with `autoUpdate` rewrite the config
 * on every run, which conflicts between parallel branches and differs
 * between machines.
 */

const root = path.resolve(import.meta.dirname, "../../..");

/**
 * Test runs that may skip the network guard, with the reason. The key is
 * the config file and the project name (`#name`, empty for no projects).
 */
const withoutGuard = new Map<string, string>([
  [
    "packages/ui/vitest.config.ts#stories",
    "runs in Chromium, where node:net does not exist; stories load no data",
  ],
]);

interface TestOptions {
  name?: string;
  setupFiles?: string | string[];
  projects?: unknown[];
  coverage?: { thresholds?: Record<string, unknown> };
}

interface InlineProject {
  extends?: boolean;
  test?: TestOptions;
}

function setupFilesOf(test: TestOptions | undefined): string[] {
  const files = test?.setupFiles ?? [];
  return Array.isArray(files) ? files : [files];
}

/** The runs of a config: each inline project, or the config itself. */
function runsOf(test: TestOptions | undefined) {
  const projects = (test?.projects ?? []).filter(
    (p): p is InlineProject => typeof p === "object" && p !== null,
  );
  if (projects.length === 0)
    return [{ name: "", setupFiles: setupFilesOf(test) }];
  return projects.map((project) => ({
    name: project.test?.name ?? "",
    setupFiles: [
      ...(project.extends === true ? setupFilesOf(test) : []),
      ...setupFilesOf(project.test),
    ],
  }));
}

const configFiles = globSync("{apps,packages,tooling}/*/vitest.config.ts", {
  cwd: root,
}).sort();

/**
 * Configs of packages that measure coverage: their `test:unit:coverage`
 * runs vitest with `--coverage`. Checks and test helpers only run their
 * tests there.
 */
const coverageConfigs = configFiles.filter((file) => {
  const pkg = JSON.parse(
    readFileSync(path.join(root, path.dirname(file), "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  return pkg.scripts?.["test:unit:coverage"]?.includes("--coverage") ?? false;
});

async function load(file: string): Promise<TestOptions | undefined> {
  const module = (await import(pathToFileURL(path.join(root, file)).href)) as {
    default: { test?: TestOptions };
  };
  return module.default.test;
}

describe("vitest configs", () => {
  it("finds the configs", () => {
    expect(configFiles).toContain("packages/core/vitest.config.ts");
  });

  it.each(configFiles)("%s blocks the network in every run", async (file) => {
    const unguarded = runsOf(await load(file))
      .filter(
        (run) => !run.setupFiles.some((f) => f.endsWith("/no-network.ts")),
      )
      .map((run) => `${file}#${run.name}`)
      .filter((key) => !withoutGuard.has(key));
    expect(unguarded).toEqual([]);
  });

  it.each(coverageConfigs)("%s has fixed coverage floors", async (file) => {
    const thresholds = (await load(file))?.coverage?.thresholds ?? {};
    expect(thresholds).not.toHaveProperty("autoUpdate");
    for (const metric of ["statements", "branches", "functions", "lines"])
      expect(thresholds[metric], `${file}: ${metric}`).toBeGreaterThan(0);
  });
});
