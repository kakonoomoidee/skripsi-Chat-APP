/// <reference types="vitest" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import obfuscatorPlugin from "vite-plugin-javascript-obfuscator";

/**
 * Configures the Vite bundler for the client application.
 * Integrates React, TailwindCSS, path aliasing, aggressive
 * JavaScript obfuscation for production, and Vitest configuration.
 * Excludes App.tsx to preserve dynamic import paths for lazy loading.
 *
 * @returns {import('vite').UserConfig} The parsed Vite configuration object.
 */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    obfuscatorPlugin({
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [/node_modules/, /App\.tsx/],
      apply: "build",
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        stringArray: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.75,
        disableConsoleOutput: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  esbuild:
    mode === "production"
      ? {
          drop: ["console", "debugger"],
        }
      : undefined,
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom")
            ) {
              return "vendor-ui-core";
            }
            if (id.includes("zustand") || id.includes("dexie")) {
              return "vendor-state-db";
            }
            if (
              id.includes("ethers") ||
              id.includes("ms") ||
              id.includes("dexie-react-hooks")
            ) {
              return "vendor-utils-heavy";
            }
          }
        },
      },
    },
  },
}));