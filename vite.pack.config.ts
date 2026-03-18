import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: "./tsconfig.lib.json",
      outDir: "./pack",
      rollupTypes: true,
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "./lib/index.ts"),
      name: "DPath",
      fileName: "index",
    },
    rollupOptions: {
      input: resolve(__dirname, "./lib/index.ts"),
      output: {
        dir: "./pack",
        format: "umd",
        exports: "named",
      },
    },
  },
  publicDir: false,
});
