import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@repo/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        // Fixed floors below the measured values. Raise them by hand.
        thresholds: {
          statements: 55,
          branches: 55,
          functions: 60,
          lines: 55,
        },
      },
    },
  }),
);
