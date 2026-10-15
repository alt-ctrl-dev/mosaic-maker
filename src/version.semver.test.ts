import { describe, it, expect } from "vitest";
import { PACKAGE_VERSION, VERSION_STRING } from "./version";

describe("version semver", () => {
	it("exports PACKAGE_VERSION as a bare X.Y.Z semver", () => {
		expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it("exports VERSION_STRING as v{semver}+{commit} for display", () => {
		expect(VERSION_STRING).toMatch(/^v\d+\.\d+\.\d+\+[a-f0-9]+$/);
	});
});
