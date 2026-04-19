import { defineConfig } from "vite";
import path from "node:path";

// The dev entry lives in `dev/` so the repository root is free of any
// Vite-specific `index.html`. GitHub Pages can therefore serve a committed
// `docs/` folder directly without tripping over the dev-mode HTML.
export default defineConfig({
  root: "dev",
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "docs"),
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});
