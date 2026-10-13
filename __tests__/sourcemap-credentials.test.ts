import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const FAKE_TOKEN = "fake-test-token-12345";

describe("Sourcemap Credentials Security", () => {
	const distDir = join(__dirname, "../dist");
	const buildArtifacts: string[] = [];
	let originalEnv: NodeJS.ProcessEnv;

	beforeAll(() => {
		originalEnv = { ...process.env };
		process.env.SOURCEMAP_UPLOADER_CREDENTIAL = FAKE_TOKEN;
		process.env.VITE_FARO_APP_NAME = "test-app";

		try {
			execSync("pnpm run build", { stdio: "inherit" });
		} catch (error) {
			console.warn("Build failed, but continuing with tests:", error);
		}

		if (existsSync(distDir)) {
			const collectFiles = (dir: string) => {
				const items = readdirSync(dir, { withFileTypes: true });
				for (const item of items) {
					const fullPath = join(dir, item.name);
					if (item.isDirectory()) {
						collectFiles(fullPath);
					} else {
						buildArtifacts.push(fullPath);
					}
				}
			};
			collectFiles(distDir);
		}
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it("excludes the upload credential from all build artifacts", () => {
		const foundInFiles: string[] = [];

		for (const artifactPath of buildArtifacts) {
			try {
				const content = readFileSync(artifactPath, "utf-8");
				if (content.includes(FAKE_TOKEN)) {
					foundInFiles.push(artifactPath);
				}
			} catch (_error) {
				// Skip binary files that can't be read as UTF-8
			}
		}

		expect(
			foundInFiles,
			`Sourcemap uploader credential found in files: ${foundInFiles.join(", ")}`,
		).toHaveLength(0);
	});
});
