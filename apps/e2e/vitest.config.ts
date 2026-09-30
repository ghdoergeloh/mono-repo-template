import { defineConfig, mergeConfig } from "vitest/config";

import { viteConfig } from "@repo/vitest/config";

// Unit tests of the helpers; the end-to-end tests run with Playwright.
export default mergeConfig(viteConfig, defineConfig({}));
