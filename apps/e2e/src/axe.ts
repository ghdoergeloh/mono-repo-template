import type { Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { expect } from "@playwright/test";

/**
 * Runs axe on the page as rendered, with the real CSS: roles, names,
 * labels, landmarks and contrast. Waits for running animations first, so
 * overlays are checked in their final colors.
 */
export async function expectAccessible(page: Page, screen: string) {
  // A string: this package has no DOM types.
  await page.evaluate(`Promise.all(
    document
      .getAnimations()
      .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
      .map((a) => a.finished.catch(() => undefined)),
  )`);
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.map((v) => {
    const nodes = v.nodes.map(
      (n) => `${n.target.join(" ")}: ${n.failureSummary ?? n.html}`,
    );
    return `${v.id}: ${v.help} (${nodes.join("; ")})`;
  });
  expect(violations, `axe on ${screen}`).toEqual([]);
}
