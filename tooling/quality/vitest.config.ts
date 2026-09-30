import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@repo/vitest/config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Loads the vitest config of every package.
    test: { testTimeout: 30_000 },
  }),
);
