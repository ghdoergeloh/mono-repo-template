import { cpSync } from "node:fs";
import { build } from "esbuild";

/**
 * Bundles the CLI with all dependencies into dist/index.js. Workspace
 * packages export TypeScript sources, which plain Node.js cannot load.
 * The SQL migrations go next to the bundle, where `migrationsFolder()`
 * finds them.
 */
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  jsx: "automatic",
  // Optional native driver that `pg` loads only when it is installed.
  external: ["pg-native"],
  // Makes the bundle executable and lets bundled CommonJS code call `require`.
  banner: {
    js: "#!/usr/bin/env node\nimport { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: "info",
});

cpSync("../../packages/db/drizzle", "dist/drizzle", { recursive: true });
