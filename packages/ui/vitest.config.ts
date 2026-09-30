import type { BrowserProviderOption } from "vitest/node";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { noNetwork } from "@repo/vitest/config";

/**
 * Two projects: `unit` runs function and component tests in jsdom,
 * `stories` renders every story in Chromium with the real CSS, runs axe on
 * it and compares a screenshot with the reference in `__screenshots__`.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{spec,test}.{ts,tsx}",
        "src/**/*.stories.tsx",
        "src/test/**",
      ],
      reporter: ["text", "cobertura", "html", "json"],
      provider: "v8",
      reportsDirectory: "./coverage",
      // Fixed floors below the measured values. Raise them by hand.
      thresholds: {
        statements: 18,
        branches: 16,
        functions: 17,
        lines: 18,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          setupFiles: [noNetwork, "./vitest.setup.ts"],
          include: ["src/**/*.spec.{ts,tsx}"],
        },
      },
      {
        extends: true,
        plugins: [tailwindcss()],
        test: {
          name: "stories",
          include: ["src/**/*.browser.test.tsx"],
          // The reference images come from Chromium on Linux arm64 (the CI
          // runner, the dev container on Apple silicon). Other systems render
          // a little differently, so they skip the comparison.
          provide: {
            screenshots:
              process.platform === "linux" && process.arch === "arm64",
          },
          // No network guard: it patches node:net, which does not exist in
          // the browser. Stories load no data.
          setupFiles: ["./src/test/stories.setup.ts"],
          browser: {
            enabled: true,
            headless: true,
            // pnpm installs two copies of vitest because of the circular peer
            // dependency with @vitest/browser-playwright; the types are equal.
            provider: playwright() as unknown as BrowserProviderOption,
            instances: [{ browser: "chromium" }],
            viewport: { width: 800, height: 600 },
            // Many parallel tasks can slow down the start of the browser.
            connectTimeout: 180_000,
          },
        },
      },
    ],
  },
});
