/**
 * Configures the Vite bundler for the client application.
 * Integrates React, TailwindCSS, path aliasing, and aggressive
 * JavaScript obfuscation specifically for production builds.
 * Excludes App.tsx to preserve dynamic import paths for lazy loading.
 *
 * @returns {import('vite').UserConfig} The parsed Vite configuration object.
 */
declare const _default: import("vite").UserConfigFnObject;
export default _default;
