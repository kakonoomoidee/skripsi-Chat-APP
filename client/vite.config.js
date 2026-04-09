import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import obfuscatorPlugin from "vite-plugin-javascript-obfuscator";
/**
 * Configures the Vite bundler for the client application.
 * Integrates React, TailwindCSS, path aliasing, and aggressive
 * JavaScript obfuscation specifically for production builds.
 * @returns {import('vite').UserConfig} The parsed Vite configuration object.
 */
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        obfuscatorPlugin({
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: [/node_modules/],
            // Apply ONLY when building for production, keep dev server fast
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
    // Optional: You can explicitly set build targets if needed
    build: {
        target: "esnext",
    },
});
