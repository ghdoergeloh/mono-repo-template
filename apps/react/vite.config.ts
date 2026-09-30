import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The SPA calls the API on its own origin, as in production, where the API
 * serves the built SPA. The dev server forwards `/api` to the API.
 */
const apiTarget =
  process.env["API_PROXY_TARGET"] ??
  `http://localhost:${process.env["API_PORT"] ?? "3000"}`;
const proxy = { "/api": apiTarget };

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
  ],
  envDir: path.resolve(import.meta.dirname, "../.."),
  resolve: {
    alias: {
      "~": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: { proxy },
  preview: { proxy },
});
