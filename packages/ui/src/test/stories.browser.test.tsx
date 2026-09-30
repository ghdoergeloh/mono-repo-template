import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Locator } from "vitest/browser";
import { composeStory } from "@storybook/react-vite";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, inject, it } from "vitest";
import { page } from "vitest/browser";

type StoryModule = Record<string, unknown> & { default: Meta };

const modules = import.meta.glob<StoryModule>("../**/*.stories.tsx", {
  eager: true,
});

const themes = ["light", "dark"] as const;

afterEach(() => {
  // Unmounts the story, including overlays React Aria portals into the body.
  cleanup();
  // Removes what outlives the story, such as the live announcer region.
  document.body.replaceChildren();
});

/**
 * Waits until open menus, popovers and tooltips have finished their enter
 * animation, so axe and the screenshot see their final state.
 */
async function settle() {
  const finite = document
    .getAnimations()
    .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime));
  await Promise.all(finite.map((a) => a.finished.catch(() => undefined)));
  await document.fonts.ready;
}

/** True when the body shows text that is not inside a disabled control. */
function hasCheckableText(): boolean {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || (node.textContent ?? "").trim() === "") continue;
    // WCAG exempts disabled controls from the contrast rules.
    if (el.closest("[disabled], [aria-disabled='true'], [data-disabled]"))
      continue;
    if (el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      return true;
  }
  return false;
}

/**
 * Compares the page with the reference image `name`. pnpm installs several
 * copies of vitest (see vitest.config.ts), so the types that browser mode
 * adds to `expect` do not reach this file; the call itself is the one of
 * the docs.
 */
function expectScreenshot(name: string): Promise<void> {
  const browserExpect = expect as unknown as {
    element(locator: Locator): {
      toMatchScreenshot(
        name: string,
        options: {
          comparatorName: "pixelmatch";
          comparatorOptions: { allowedMismatchedPixels: number };
        },
      ): Promise<void>;
    };
  };
  return browserExpect
    .element(page.elementLocator(document.body))
    .toMatchScreenshot(name, {
      comparatorName: "pixelmatch",
      // pixelmatch ignores anti-aliased pixels, so any other pixel counts.
      comparatorOptions: { allowedMismatchedPixels: 0 },
    });
}

function storiesOf(module: StoryModule) {
  return Object.entries(module).filter(
    ([name, value]) =>
      name !== "default" && typeof value === "object" && value !== null,
  ) as [string, StoryObj][];
}

/**
 * Renders every story in light and dark with the real CSS and runs its play
 * function. Then axe checks roles, names, labels and contrast as rendered,
 * and the screenshot is compared with the reference image in
 * `__screenshots__` (on Linux arm64 only, where the references come from).
 * After an intended change, update the references with
 * `pnpm -F @repo/ui exec vitest run --project stories --update` and look
 * at every new image before you commit it.
 */
describe.each(Object.entries(modules))("%s", (_path, module) => {
  const title = module.default.title ?? "";
  it.each(
    storiesOf(module).flatMap(([name, story]) =>
      themes.map((theme) => [name, theme, story] as const),
    ),
  )(`${title} %s (%s)`, async (name, theme, story) => {
    // stories.setup.ts applies the preview (decorators, parameters) once;
    // passing it here again would wrap every story twice.
    const Story = composeStory(
      story,
      module.default,
      { initialGlobals: { theme } },
      name,
    );
    const { container } = render(<Story />);
    await Story.play?.({ canvasElement: container });
    await settle();

    // A story larger than the viewport is cut off in the screenshot.
    const html = document.documentElement;
    expect(
      html.scrollHeight,
      "story taller than the viewport",
    ).toBeLessThanOrEqual(window.innerHeight);
    expect(
      html.scrollWidth,
      "story wider than the viewport",
    ).toBeLessThanOrEqual(window.innerWidth);

    const results = await axe.run(document.body, {
      resultTypes: ["violations"],
      // Stories show single components, not whole pages with landmarks.
      rules: { region: { enabled: false } },
    });
    const violations = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
    expect(violations).toEqual([]);
    if (hasCheckableText()) {
      // Guards against a contrast check that silently looks at nothing.
      expect(
        results.passes.some((r) => r.id === "color-contrast"),
        "color-contrast checked no node",
      ).toBe(true);
    }

    const parameters = { ...module.default.parameters, ...story.parameters };
    if (inject("screenshots") && parameters["screenshot"] !== false)
      await expectScreenshot(`${title}-${name}-${theme}`);
  });
});
