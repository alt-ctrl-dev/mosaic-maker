/** Application version injected at build time. */
export const PACKAGE_VERSION = import.meta.env.VITE_APP_VERSION;

/** Git commit hash injected at build time. */
export const COMMIT_SHA = import.meta.env.VITE_APP_COMMIT;

/** Semantic version without commit SHA */
export const SEMVER = PACKAGE_VERSION || "?.?.?";

/** Human-readable version identifier in `v{version}+{commit}` format. */
export const VERSION_STRING =
	PACKAGE_VERSION && COMMIT_SHA
		? `v${PACKAGE_VERSION}+${COMMIT_SHA}`
		: "v?.?.?+unknown";
