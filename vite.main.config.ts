import { defineConfig } from "vite";
import path from "path";

const external = [
  "electron",
  "electron-store",
  "crypto",
  "fs",
  "fs/promises",
  "path",
  "os",
  "url",
];

export default defineConfig({
  build: {
    outDir: "dist/electron",
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "electron/main.ts"),
      formats: ["cjs"],
      fileName: () => "main.js",
    },
    rollupOptions: {
      external,
    },
  },
  resolve: {
    alias: {
      "@lib": path.resolve(__dirname, "lib"),
    },
  },
});
