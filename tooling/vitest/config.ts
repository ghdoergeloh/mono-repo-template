import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Setup file that rejects network access to other hosts. Every unit test
 * config loads it; `tooling/quality/src/workspace.spec.ts` checks that.
 */
export const noNetwork = fileURLToPath(
  new URL("./no-network.ts", import.meta.url),
);

/**
 * Tests of server-side packages. Each package sets fixed coverage floors
 * in its own `vitest.config.ts`: a little below the measured values, and
 * raised by hand when the coverage grows. Floors that rewrite themselves
 * (`autoUpdate`) conflict between parallel branches.
 */
export const viteConfig = defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    setupFiles: [noNetwork],
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.spec.ts"],
      reporter: ["text", "cobertura", "json"],
      provider: "istanbul",
      reportsDirectory: "./coverage",
    },
  },
});

/** Tests of React code in jsdom. The `~` alias points to `src`. */
export const viteReactConfig = defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [noNetwork, "./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Rendering with overlays takes a few seconds on a busy machine or runner.
    testTimeout: 15_000,
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/main.tsx",
        "src/routeTree.gen.ts",
        "src/test/**",
      ],
      reporter: ["text", "cobertura", "html", "json"],
      provider: "v8",
      reportsDirectory: "./coverage",
    },
    globals: true,
  },
  resolve: {
    alias: {
      // Relative to the root of the package that runs the tests.
      "~": "/src",
    },
  },
});
