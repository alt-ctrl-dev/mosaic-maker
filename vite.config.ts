import { execSync } from "node:child_process";
import faroUploader from "@grafana/faro-rollup-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { version as packageVersion } from "./package.json";

function getGitCommitSha() {
	try {
		return execSync("git rev-parse --short HEAD").toString().trim();
	} catch (error) {
		console.error("Failed to get git commit:", error);
		return "unknown";
	}
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const commitSha = getGitCommitSha();

	const define = {
		"import.meta.env.VITE_APP_VERSION": JSON.stringify(
			env.VITE_APP_VERSION || packageVersion,
		),
		"import.meta.env.VITE_APP_COMMIT": JSON.stringify(
			env.VITE_APP_COMMIT || commitSha,
		),
	};

	return {
		base: "/mosaic-maker/",
		define,
		plugins: [
			react(),
			// Only upload sourcemaps where the token is available (CI).
			...(env.VITE_FARO_SOURCEMAP_TOKEN
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
							apiKey: env.VITE_FARO_SOURCEMAP_TOKEN,
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
