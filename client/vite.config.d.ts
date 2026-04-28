/**
 * Configures the Vite bundler for the client application.
 * Integrates React, TailwindCSS, path aliasing, aggressive
 * JavaScript obfuscation for production, and Vitest configuration.
 * Excludes App.tsx to preserve dynamic import paths for lazy loading.
 *
 * @returns {import('vite').UserConfig} The parsed Vite configuration object.
 */
declare const _default: import("vite").UserConfigFnObject;
export default _default;
