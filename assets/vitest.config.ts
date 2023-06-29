import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig(({ command }: any) => {
  const isDev = command !== "build";
  if (isDev) {
    // Terminate the watcher when Phoenix quits
    process.stdin.on("close", () => {
      process.exit(0);
    });

    process.stdin.resume();
  }
  return {
    publicDir: "static",
    plugins: [
      svgr(),
      react({
        babel: {
          plugins: [
            ["@babel/plugin-proposal-decorators", { version: "legacy" }],
          ],
        },
      }),
    ],
    test: {
      environment: "jsdom", //"happy-dom", //"jsdom",
      globals: true,
      // setupFiles: "src/setupTests.js",
    },
    server: {
      host: "0.0.0.0",
    },
    build: {
      outDir: "../priv/static",
      emptyOutDir: true,
      manifest: false,
      minify: true,
      chunkSizeWarningLimit: 4048,
      // rollupOptions: {
      //   input: "../js/app.js",
      // },
      rollupOptions: {
        input: {
          main: "./js/src/main.tsx",
        },
        output: {
          entryFileNames: "assets/[name].js", // remove hash
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },
  };
});
