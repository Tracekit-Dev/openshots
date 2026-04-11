// Single source of truth for app version.
// Injected by Vite at build time from package.json via vite.config.ts define.
export const APP_VERSION: string = __APP_VERSION__;

declare const __APP_VERSION__: string;
