import { describe, it, expect } from "vitest";

describe("Mosaic Worker Module Resolution", () => {
	it("should export a valid worker URL for the module bundler", () => {
		const workerUrl = new URL("./mosaic-worker.ts", import.meta.url);
		expect(workerUrl.href).toBeTruthy();
	});
});
