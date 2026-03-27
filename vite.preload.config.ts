import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/electron",
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    lib: {
      entry: "electron/preload.ts",
      formats: ["cjs"],
      fileName: () => "preload.js",
    },
    rollupOptions: {
      external: ["electron"],
    },
  },
});
