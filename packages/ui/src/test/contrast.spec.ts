import { wcagContrast } from "culori";
import { describe, expect, it } from "vitest";

import { colorPairs } from "./color-pairs";
import { readThemes } from "./tokens";

const themes = readThemes();
const minimum = { text: 4.5, graphic: 3 } as const;

/**
 * The contrast of every token pair in both themes, computed from
 * `tooling/tailwind/theme.css`. The story tests check the contrast as
 * rendered; this test names the token pair that is too weak.
 */
describe.each(["light", "dark"] as const)("color contrast (%s)", (theme) => {
  it.each(colorPairs.map((pair) => [`${pair.fg} on ${pair.bg}`, pair]))(
    "%s",
    (_name, pair) => {
      const ratio = wcagContrast(
        themes[theme](pair.fg),
        themes[theme](pair.bg),
      );
      expect(ratio).toBeGreaterThanOrEqual(minimum[pair.kind]);
    },
  );
});
