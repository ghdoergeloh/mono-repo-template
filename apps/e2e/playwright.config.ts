import { defineConfig, devices } from "@playwright/test";

import { API_URL, apiEnv, E2E_WEB_PORT, WEB_URL, webEnv } from "./src/env";

/**
 * End-to-end tests against the real API, the Vite dev server and a fresh
 * PostgreSQL database. Run with `pnpm test:e2e`; see `README.md`.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.ts",
  // One database for all tests: run them one after the other.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    // Any changed pixel fails the comparison.
    toHaveScreenshot: { maxDiffPixels: 0, animations: "disabled" },
  },
  // One reference per screenshot; they come from Linux (see screens.e2e.ts).
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  reporter: process.env["CI"]
    ? [["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: WEB_URL,
    locale: "en-US",
    timezoneId: "Europe/Berlin",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      name: "api",
      // A new database with all migrations, then the API from source.
      command:
        "tsx src/prepare-db.ts && pnpm -F @repo/api exec tsx src/index.ts",
      url: `${API_URL}/ready`,
      env: apiEnv(),
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
    },
    {
      name: "web",
      command: `pnpm -F @repo/react exec vite --port ${E2E_WEB_PORT} --strictPort`,
      url: WEB_URL,
      env: webEnv(),
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
