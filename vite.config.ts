import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Relative asset URLs so the built bundle also works when it is loaded from
  // the local filesystem inside the desktop (Tauri) webview, not only when
  // served from a web root.
  base: "./",
  plugins: [
    // Must run before the React plugin: it generates src/routeTree.gen.ts from
    // the files in src/routes and wires route-level code splitting.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
