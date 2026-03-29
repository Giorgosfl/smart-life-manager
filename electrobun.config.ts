import type { ElectrobunConfig } from "electrobun/bun";

export default {
  app: {
    name: "Smart Life Manager",
    identifier: "com.smartlife.manager",
    version: "1.0.0",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    copy: {
      "dist/renderer/index.html": "views/mainview/index.html",
      "dist/renderer/assets": "views/mainview/assets",
    },
  },
} satisfies ElectrobunConfig;
