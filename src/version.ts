/** Application version sourced from build-time environment, falling back to the package.json default. */
export const PACKAGE_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

/** Git commit hash injected at build time via Vite's define. */
export const COMMIT_SHA = import.meta.env.VITE_APP_COMMIT || "unknown";

/** Human-readable version identifier in `v{version}+{commit}` format. */
export const VERSION_STRING = `v${PACKAGE_VERSION}+${COMMIT_SHA}`;
