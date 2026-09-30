import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@repo/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        // Fixed floors below the measured values. Raise them by hand. They
        // hold without TEST_DATABASE_URL, where postgres.spec.ts is skipped.
        thresholds: {
          statements: 40,
          branches: 20,
          functions: 40,
          lines: 40,
        },
      },
    },
  }),
);
