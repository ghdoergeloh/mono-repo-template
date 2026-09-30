import { defineConfig, mergeConfig } from "vitest/config";

import { viteReactConfig } from "@repo/vitest/config";

export default mergeConfig(
  viteReactConfig,
  defineConfig({
    test: {
      coverage: {
        // Fixed floors below the measured values. Raise them by hand.
        thresholds: {
          statements: 12,
          branches: 25,
          functions: 28,
          lines: 10,
        },
      },
    },
  }),
);
