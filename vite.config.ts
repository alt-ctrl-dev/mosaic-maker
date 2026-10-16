import { execSync } from "node:child_process";
import faroUploader from "@grafana/faro-rollup-plugin";
import stylexPlugin from "@stylexjs/rollup-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import pkg from "./package.json" with { type: "json" };

/**
 * Oldest browsers the CSS may target. `light-dark()` must survive
 * minification: both minifiers otherwise lower it to prefers-color-scheme
 * custom properties, which the theme toggle cannot override.
 */
const CSS_TARGETS = ["chrome123", "safari17.5", "firefox120"];
/** Lightning CSS encodes versions as major << 16 | minor << 8. */
const cssVersion = (major: number, minor = 0) => (major << 16) | (minor << 8);

function getGitCommitSha() {
	try {
		return execSync("git rev-parse --short HEAD").toString().trim();
	} catch (error) {
		console.error("Failed to get git commit:", error);
		return "unknown";
	}
}

export default defineConfig(({ mode, command }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const commitSha = getGitCommitSha();
	const base = "/mosaic-maker/";

	const define = {
		"import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
		"import.meta.env.VITE_APP_COMMIT": JSON.stringify(
			env.VITE_APP_COMMIT || commitSha,
		),
	};

	return {
		base,
		build: { cssTarget: CSS_TARGETS },
		define,
		plugins: [
			stylexPlugin({
				runtimeInjection: command === "serve",
				lightningcssOptions: {
					targets: {
						chrome: cssVersion(123),
						safari: cssVersion(17, 5),
						firefox: cssVersion(120),
					},
				},
			}),
			// The StyleX Rollup plugin emits CSS separately from Vite's CSS graph.
			{
				name: "stylex-stylesheet",
				transformIndexHtml:
					command === "build"
						? (html: string) =>
								html.replace(
									"</head>",
									`<link rel="stylesheet" href="${base}stylex.css?v=${env.VITE_APP_COMMIT || commitSha}" /></head>`,
								)
						: undefined,
			},
			react(),
			// Only upload sourcemaps where the token is available (CI).
			...(process.env.SOURCEMAP_UPLOADER_CREDENTIAL
				? [
						faroUploader({
							appName: env.VITE_FARO_APP_NAME,
							endpoint:
								"https://faro-api-prod-au-southeast-1.grafana.net/faro/api/v1",
							appId: "575",
							stackId: "1807442",
							verbose: true,
							// instructions on how to obtain your API key are in the documentation
							// https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/sourcemap-upload-plugins/#obtain-an-api-key
							apiKey: process.env.SOURCEMAP_UPLOADER_CREDENTIAL,
							gzipContents: true,
						}),
					]
				: []),
		],
		test: {
			environment: "jsdom",
			exclude: ["**/node_modules/**", "**/dist/**", ".sandcastle/worktrees/**"],
			globals: true,
			setupFiles: ["./src/test-setup.ts"],
		},
	};
});
