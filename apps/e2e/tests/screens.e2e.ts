import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { signUp } from "../src/api";
import { expectAccessible } from "../src/axe";

/**
 * Every screen in light and dark, on a desktop and a phone: axe checks the
 * page as rendered, and the screenshot is compared with the reference in
 * `tests/__screenshots__`. After an intended change, update the references
 * with `pnpm test:e2e --update-snapshots` and look at every new image.
 *
 * The references come from Chromium on Linux arm64 (the CI runner, the dev
 * container on Apple silicon). Other systems render a little differently
 * and skip the comparison.
 */
const comparesScreenshots =
  process.platform === "linux" && process.arch === "arm64";
const screens: {
  name: string;
  path: string;
  signedIn: boolean;
  heading: string;
}[] = [
  { name: "login", path: "/login", signedIn: false, heading: "Sign In" },
  { name: "signup", path: "/signup", signedIn: false, heading: "Sign Up" },
  { name: "home", path: "/", signedIn: true, heading: "Welcome home" },
  { name: "about", path: "/about", signedIn: true, heading: "About" },
];

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  // The narrowest phone the app supports.
  { name: "phone", width: 400, height: 800 },
] as const;

const schemes = ["light", "dark"] as const;

async function open(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  // Values that come from the API must be there before the screenshot.
  await expect(page.getByText("…")).toHaveCount(0);
  await page.evaluate("document.fonts.ready");
}

for (const screen of screens) {
  for (const viewport of viewports) {
    for (const scheme of schemes) {
      test(`${screen.name} (${viewport.name}, ${scheme})`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme: scheme });
        // The same account on every run keeps the screenshots comparable;
        // the database is new on every run.
        if (screen.signedIn)
          await signUp(page, {
            name: "Robin Example",
            email: `robin-${screen.name}-${viewport.name}-${scheme}@example.test`,
            password: "a-long-test-password",
          });
        await open(page, screen.path, screen.heading);

        // Nothing may be wider than the screen, e.g. a table or a sidebar.
        const overflow = await page.evaluate(
          "document.documentElement.scrollWidth - document.documentElement.clientWidth",
        );
        expect(overflow, "horizontal scrolling").toBeLessThanOrEqual(0);

        await expectAccessible(
          page,
          `${screen.name} ${viewport.name} ${scheme}`,
        );

        if (comparesScreenshots)
          await expect(page).toHaveScreenshot(
            `${screen.name}-${viewport.name}-${scheme}.png`,
            { fullPage: true },
          );
      });
    }
  }
}
