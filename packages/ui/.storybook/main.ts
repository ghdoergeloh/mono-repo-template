import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  viteFinal(viteConfig) {
    viteConfig.plugins = [
      ...(viteConfig.plugins ?? []),
      react(),
      tailwindcss(),
    ];
    return viteConfig;
  },
};

export default config;
