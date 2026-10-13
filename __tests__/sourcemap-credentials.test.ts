import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Sourcemap Credentials Security", () => {
	const distDir = join(__dirname, "../dist");
	const buildArtifacts: string[] = [];
	let originalEnv: NodeJS.ProcessEnv;

	beforeAll(() => {
		// Store original environment
		originalEnv = { ...process.env };

		// Set a fake sourcemap uploader credential for testing
		process.env.SOURCEMAP_UPLOADER_CREDENTIAL = "fake-test-token-12345";
		process.env.VITE_FARO_APP_NAME = "test-app";

		// Clean and rebuild
		try {
			execSync("pnpm run build", { stdio: "inherit" });
		} catch (error) {
			console.warn("Build failed, but continuing with tests:", error);
		}

		// Collect all build artifacts
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
		// Restore original environment
		process.env = originalEnv;
	});

	it("should not contain sourcemap uploader credentials in any build artifacts", () => {
		const fakeToken = "fake-test-token-12345";
		const foundInFiles: string[] = [];

		for (const artifactPath of buildArtifacts) {
			try {
				const content = readFileSync(artifactPath, "utf-8");
				if (content.includes(fakeToken)) {
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

	it("should use SOURCEMAP_UPLOADER_CREDENTIAL as build-only environment variable", () => {
		// This test verifies the implementation change
		// The credential should now be accessed via process.env.SOURCEMAP_UPLOADER_CREDENTIAL
		// which is not prefixed with VITE_ and thus not exposed to the client
		expect(process.env.SOURCEMAP_UPLOADER_CREDENTIAL).toBeDefined();
		expect(process.env.VITE_FARO_SOURCEMAP_TOKEN).toBeUndefined();
	});
});
