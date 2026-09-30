/**
 * Token pairs that the components and apps put on top of each other. Text
 * pairs need at least 4.5:1 (WCAG AA), graphic pairs such as the focus ring
 * at least 3:1. A new combination of tokens in code needs a pair here.
 */
export interface ColorPair {
  fg: string;
  bg: string;
  kind: "text" | "graphic";
}

const text = (fg: string, bg: string): ColorPair => ({ fg, bg, kind: "text" });
const graphic = (fg: string, bg: string): ColorPair => ({
  fg,
  bg,
  kind: "graphic",
});

export const colorPairs: ColorPair[] = [
  // Surfaces and their text.
  text("foreground", "background"),
  text("card-foreground", "card"),
  text("popover-foreground", "popover"),
  text("primary-foreground", "primary"),
  text("secondary-foreground", "secondary"),
  text("accent-foreground", "accent"),
  text("destructive-foreground", "destructive"),
  // Labels, descriptions and values.
  text("muted-foreground", "background"),
  text("muted-foreground", "card"),
  text("muted-foreground", "muted"),
  // Links and states as text on the page.
  text("primary", "background"),
  text("destructive", "background"),
  text("destructive", "card"),
  text("success", "background"),
  text("warning-foreground", "background"),
  // Focus ring and selected borders.
  graphic("ring", "background"),
  graphic("primary", "background"),
];
