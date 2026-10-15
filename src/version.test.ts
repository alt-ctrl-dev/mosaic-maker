import { describe, it, expect } from "vitest";
import { PACKAGE_VERSION, COMMIT_SHA, VERSION_STRING } from "./version";

describe("version", () => {
	it("should export PACKAGE_VERSION provided by vite build process", () => {
		// Vite replaces import.meta.env.VITE_APP_VERSION with actual value
		expect(PACKAGE_VERSION).toBe("1.0.0");
	});

	it("should export COMMIT_SHA provided by vite build process", () => {
		// Vite replaces import.meta.env.VITE_APP_COMMIT with actual value
		expect(COMMIT_SHA).toBe("45cf19d");
	});

	it("should construct VERSION_STRING in v{version}+{commit} format", () => {
		expect(VERSION_STRING).toBe("v1.0.0+45cf19d");
	});
});
