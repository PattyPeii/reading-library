/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { loadLibrary } from "./src/lib/content.ts";

const CONTENT_DIR = path.resolve(process.env.CONTENT_DIR ?? "content");
const ID = "virtual:library";
const RESOLVED = "\0" + ID;

/** Exposes the validated library as `import library from "virtual:library"`. */
function libraryPlugin(): Plugin {
  return {
    name: "reading-library-content",
    resolveId: id => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return;
      const { library, validation } = loadLibrary(CONTENT_DIR);
      for (const w of validation.warnings) this.warn(`${w.file}: ${w.message}`);
      if (validation.errors.length)
        this.error(`Content errors:\n${validation.errors.map(e => `  ${e.file}: ${e.message}`).join("\n")}`);
      return `export default ${JSON.stringify(library)};`;
    },
    configureServer(server) {
      server.watcher.add(CONTENT_DIR);
      const reload = (file: string) => {
        if (!file.startsWith(CONTENT_DIR)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", reload).on("change", reload).on("unlink", reload);
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), libraryPlugin()],
  test: { include: ["tests/**/*.test.ts"] },
});
