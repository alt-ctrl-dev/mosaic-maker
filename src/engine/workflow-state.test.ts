import { describe, expect, it } from "vitest";
import { createBrickTessera, createBrickTesserae } from "./workflow-state";

describe("createBrickTessera", () => {
	it("creates a valid synthetic tessera with a rendered brick preview", () => {
		const tessera = createBrickTessera("#FF0000");

		expect(tessera.color).toBe("#FF0000");
		expect(tessera.isValid).toBe(true);
		expect(tessera.previewUrl).toMatch(/^data:/);
		expect(tessera.file).toBeUndefined();
		expect(tessera.fileName).toBe("brick-#FF0000");
	});
});

describe("createBrickTesserae", () => {
	it("creates one synthetic tessera per colour", () => {
		const tesserae = createBrickTesserae(["#FF0000", "#0000FF"]);

		expect(tesserae).toHaveLength(2);
		expect(tesserae.map((t) => t.color)).toEqual(["#FF0000", "#0000FF"]);
		expect(tesserae.every((t) => t.isValid)).toBe(true);
	});
});
