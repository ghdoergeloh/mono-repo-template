import type { Preview } from "@storybook/react-vite";

import "../src/storybook.css";

/**
 * Stories render in the light or the dark theme, switched in the toolbar.
 * The story tests render every story in both.
 */
const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: {
        title: "Theme",
        icon: "contrast",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => {
      const { theme } = context.globals as { theme?: string };
      document.documentElement.classList.toggle("dark", theme === "dark");
      return (
        <div className="bg-background text-foreground p-6 font-sans text-sm">
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    layout: "fullscreen",
    // Accessibility violations fail the story tests and show in Storybook.
    a11y: { test: "error" },
  },
};

export default preview;
