import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { PlopTypes } from "@turbo/gen";

interface PackageJson {
  name: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("init", {
    description: "Generate a new package for the Acme Monorepo",
    prompts: [
      {
        type: "input",
        name: "name",
        message:
          "What is the name of the package? (You can skip the `@repo/` prefix)",
      },
      {
        type: "input",
        name: "deps",
        message:
          "Enter a space separated list of dependencies you would like to install",
      },
    ],
    actions: [
      (answers) => {
        if ("name" in answers && typeof answers.name === "string") {
          if (answers.name.startsWith("@repo/")) {
            answers.name = answers.name.replace("@repo/", "");
          }
        }
        return "Config sanitized";
      },
      {
        type: "add",
        path: "packages/{{ name }}/package.json",
        templateFile: "templates/package.json.hbs",
      },
      {
        type: "add",
        path: "packages/{{ name }}/tsconfig.json",
        templateFile: "templates/tsconfig.json.hbs",
      },
      {
        type: "add",
        path: "packages/{{ name }}/vitest.config.ts",
        templateFile: "templates/vitest.config.ts.hbs",
      },
      {
        type: "add",
        path: "packages/{{ name }}/src/index.ts",
        template: "export const name = '{{ name }}';",
      },
      {
        type: "add",
        path: "packages/{{ name }}/src/index.spec.ts",
        templateFile: "templates/index.spec.ts.hbs",
      },
      {
        type: "modify",
        path: "packages/{{ name }}/package.json",
        transform(content, answers) {
          if ("deps" in answers && typeof answers.deps === "string") {
            const pkg = JSON.parse(content) as PackageJson;
            const catalog = readFileSync("pnpm-workspace.yaml", "utf8");
            for (const dep of answers.deps.split(" ").filter(Boolean)) {
              // Versions live in the catalog, never in package.json.
              if (!new RegExp(`^  "?${dep}"?:`, "m").test(catalog))
                console.warn(
                  `${dep} is not in the catalog of pnpm-workspace.yaml. Add it there before you run pnpm install.`,
                );
              if (!pkg.dependencies) pkg.dependencies = {};
              pkg.dependencies[dep] = "catalog:";
            }
            return JSON.stringify(pkg, null, 2);
          }
          return content;
        },
      },
      async (answers) => {
        /**
         * Install deps and format everything
         */
        if ("name" in answers && typeof answers.name === "string") {
          // execSync("pnpm dlx sherif@latest --fix", {
          //   stdio: "inherit",
          // });
          execSync("pnpm install --no-frozen-lockfile", { stdio: "inherit" });
          execSync(`pnpm oxfmt packages/${answers.name}`);
          return "Package scaffolded";
        }
        return "Package not scaffolded";
      },
    ],
  });
}
