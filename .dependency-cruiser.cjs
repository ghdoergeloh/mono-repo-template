/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "This dependency is part of a circular relationship. You might want to revise " +
        "your solution (i.e. use dependency inversion, make sure the modules have a " +
        "single responsibility).",
      from: {},
      to: { circular: true },
    },
    {
      name: "packages-not-to-apps",
      severity: "error",
      comment: "Shared packages must not depend on an app.",
      from: { path: "^(packages|tooling)/" },
      to: { path: "^apps/" },
    },
    {
      name: "contract-is-transport-only",
      severity: "error",
      comment:
        "The contract is shared with the browser and the CLI. It must not pull in " +
        "server-side packages.",
      from: { path: "^packages/contract/" },
      to: { path: "^packages/(auth|core|db|transactional)/" },
    },
    {
      name: "core-is-transport-independent",
      severity: "error",
      comment:
        "Business logic in core must not know about HTTP, oRPC or better-auth. " +
        "The API and the CLI pass everything a handler needs in its context.",
      from: { path: "^packages/core/" },
      to: {
        path: [
          "^packages/(auth|contract)/",
          "node_modules/(hono|@hono|@orpc|better-auth)/",
        ],
      },
    },
    {
      name: "ui-is-presentational",
      severity: "error",
      comment: "UI components must not depend on server-side packages.",
      from: { path: "^packages/ui/" },
      to: { path: "^packages/(auth|core|db|transactional)/" },
    },
    {
      name: "tailwind-variants-only-in-tw",
      severity: "error",
      comment:
        "Import tv and twMerge from packages/ui/src/lib/tw.ts. It has the merge " +
        "rules for Tailwind 4; every other entry of tailwind-variants drops a " +
        "leading-* next to a later font size.",
      from: {
        path: "^(packages/ui|apps/react)/src/",
        pathNot: "^packages/ui/src/lib/tw\\.ts$",
      },
      to: {
        path: "(^|/)node_modules/tailwind-variants/|^tailwind-variants(/|$)",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: {
      // Paths of the workspace only: dependencies in node_modules (which
      // often live in a dist/ folder) must stay visible to the rules.
      path: [
        "\\.(test|spec)\\.[jt]sx?$",
        "(^|/)out/",
        "^(apps|packages|tooling)/[^/]+/dist/",
        "(^|/)coverage/",
        "(^|/)storybook-static/",
        "routeTree\\.gen\\.ts$",
      ],
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
