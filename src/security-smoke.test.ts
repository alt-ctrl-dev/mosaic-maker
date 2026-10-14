import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("security smoke test", () => {
	it("should have security policies in built index.html", () => {
		const indexPath = path.join(__dirname, "../dist/index.html");

		// Check that the dist/index.html file exists
		expect(fs.existsSync(indexPath)).toBe(true);

		// Read the built index.html
		const indexContent = fs.readFileSync(indexPath, "utf-8");

		// Check that security policies are present
		expect(indexContent).toContain('http-equiv="Content-Security-Policy"');
		expect(indexContent).toContain("default-src 'self'");
		expect(indexContent).toContain("frame-ancestors 'none'");
		expect(indexContent).toContain("object-src 'none'");

		// Check that referrer policy is present
		expect(indexContent).toContain('http-equiv="Referrer-Policy"');
		expect(indexContent).toContain("strict-origin-when-cross-origin");

		// Check that permissions policy is present
		expect(indexContent).toContain('http-equiv="Permissions-Policy"');
		expect(indexContent).toContain("geolocation=()");
	});

	it("should have restrictive CSP directives", () => {
		const indexPath = path.join(__dirname, "../dist/index.html");
		const indexContent = fs.readFileSync(indexPath, "utf-8");

		// Extract the CSP content by matching the specific meta tag
		const cspMatch = indexContent.match(
			/<meta http-equiv="Content-Security-Policy" content="(.*?)"/,
		);
		expect(cspMatch).toBeTruthy();

		if (cspMatch) {
			const cspContent = cspMatch[1];

			// Verify key security directives
			expect(cspContent).toContain("default-src 'self'");
			expect(cspContent).toContain("object-src 'none'");
			expect(cspContent).toContain("frame-ancestors 'none'");
			expect(cspContent).toContain("base-uri 'none'");
			expect(cspContent).toContain("form-action 'none'");

			// Ensure no wildcards or overly permissive directives
			expect(cspContent).not.toContain("*:");
			expect(cspContent).not.toContain("http:");
		}
	});
});
