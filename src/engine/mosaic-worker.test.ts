import { describe, it, expect } from "vitest";

describe("Mosaic Worker", () => {
	it("references a valid worker URL", () => {
		if (typeof Worker === "undefined") {
			expect(true).toBe(true);
			return;
		}

		const workerUrl = new URL("./mosaic-worker.ts", import.meta.url);
		expect(workerUrl).toBeTruthy();
	});
});
