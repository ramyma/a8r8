import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";

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
    define: {
      VERSION: JSON.stringify(process.env.VERSION),
    },
    publicDir: "static",
    envDir: "../.env",
    plugins: [
      svgr(),
      react({
        babel: {
          plugins: [
            ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
          ],
        },
      }),
      tailwindcss(),
    ],
    test: {
      environment: "jsdom", //"happy-dom", //"jsdom",
      globals: true,
      // setupFiles: "src/setupTests.js",
      browser: {
        provider: "playwright", // or 'webdriverio'
        enabled: true,
        name: "chromium", // browser name is required
      },
    },
    server: {
      host: "0.0.0.0",
    },
    build: {
      outDir: "../priv/static/assets",
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
          entryFileNames: "[name].js", // remove hash
          chunkFileNames: "[name].js",
          assetFileNames: "[name][extname]",
        },
      },
    },
  };
});
