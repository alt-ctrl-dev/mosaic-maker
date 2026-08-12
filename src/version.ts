/**
 * Version information for the Mosaic Maker application.
 * This file contains build-time constants that are replaced by Vite during the build process.
 */

/**
 * Package version from package.json
 * Replaced at build time with the actual version string.
 */

export const PACKAGE_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

/**
 * Git commit SHA
 * Replaced at build time with the actual commit hash.
 */

export const COMMIT_SHA = import.meta.env.VITE_APP_COMMIT || "unknown";

/**
 * Formatted version string combining package version and commit SHA
 */
export const VERSION_STRING = `v${PACKAGE_VERSION}+${COMMIT_SHA}`;
