import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";

/**
 * Local fixture module. Same rule as shouldLoadLocalFixtures in
 * src/lib/fixtures/logic.ts: serve, or an explicit env flag, and the file exists.
 * A normal production build exports null so the payload stays out of dist.
 */
function builderFixturesPlugin(command: "build" | "serve"): Plugin {
  const virtualId = "virtual:builder-fixtures";
  const resolvedId = `\0${virtualId}`;
  return {
    name: "builder-fixtures",
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return null;
      const localFile = path.resolve(__dirname, "src/data/fixtures.local.ts");
      const exists = fs.existsSync(localFile);
      const envFlag = process.env.BUILDER_FIXTURES === "1";
      const allow = exists && (command === "serve" || envFlag);
      if (!allow) return "export default null;\n";
      return `export { default } from ${JSON.stringify(localFile)};\n`;
    },
  };
}

/**
 * GitHub Pages: https://<user>.github.io/japanese-house-3d/
 * Keep base in sync with repo name (same as former next basePath).
 */
export default defineConfig(({ command }) => ({
  base: "/japanese-house-3d/",
  plugins: [react(), tailwindcss(), builderFixturesPlugin(command)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: false,
  },
  preview: {
    port: 4173,
  },
}));
