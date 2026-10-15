import { describe, it, expect } from "vitest";
import { PACKAGE_VERSION, COMMIT_SHA, VERSION_STRING } from "./version";

describe("version", () => {
	it("exports PACKAGE_VERSION as a non-empty string", () => {
		expect(typeof PACKAGE_VERSION).toBe("string");
		expect(PACKAGE_VERSION.length).toBeGreaterThan(0);
	});

	it("exports COMMIT_SHA as a non-empty string", () => {
		expect(typeof COMMIT_SHA).toBe("string");
		expect(COMMIT_SHA.length).toBeGreaterThan(0);
	});

	it("composes VERSION_STRING from PACKAGE_VERSION and COMMIT_SHA in v{version}+{commit} format", () => {
		expect(VERSION_STRING).toBe(`v${PACKAGE_VERSION}+${COMMIT_SHA}`);
	});
});
