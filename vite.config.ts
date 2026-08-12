import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { execSync } from "node:child_process";

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
			env.VITE_APP_VERSION || "1.0.0",
		),
		"import.meta.env.VITE_APP_COMMIT": JSON.stringify(
			env.VITE_APP_COMMIT || commitSha,
		),
	};

	return {
		base: "/mosaic-maker/",
		define,
		plugins: [react()],
		test: {
			environment: "jsdom",
			exclude: ["**/node_modules/**", "**/dist/**", ".sandcastle/worktrees/**"],
			globals: true,
			setupFiles: ["./src/test-setup.ts"],
		},
	};
});
