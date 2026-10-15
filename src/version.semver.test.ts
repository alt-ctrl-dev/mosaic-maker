import { describe, it, expect } from "vitest";
import { PACKAGE_VERSION, VERSION_STRING } from "./version";

describe("version semver", () => {
	it("exports PACKAGE_VERSION as the bare semver without v prefix or commit sha", () => {
		// Should be just the semver like "1.0.0", not "v1.0.0+abc1234"
		expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
		expect(PACKAGE_VERSION).not.toContain("v");
		expect(PACKAGE_VERSION).not.toContain("+");
	});

	it("VERSION_STRING includes both version and commit for display purposes", () => {
		expect(VERSION_STRING).toMatch(/^v\d+\.\d+\.\d+\+[a-f0-9]+$/);
		expect(VERSION_STRING).toContain("v");
		expect(VERSION_STRING).toContain("+");
	});
});
