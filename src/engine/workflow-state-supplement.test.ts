import { describe, expect, it, vi } from "vitest";
import { generateNoiseTesseraeFromState } from "./generate-noise-tesserae-helper";
import type { SourceImageInfo } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";
import { generateSupplementedTesserae } from "./workflow-state";

vi.mock("./generate-noise-tesserae-helper", () => ({
	generateNoiseTesseraeFromState: vi.fn(),
}));

const mockSourceImage: SourceImageInfo = {
	url: "data:image/png;base64,",
	width: 200,
	height: 100,
	orientation: 1,
};

function makeTessera(fileName: string): TesseraInfo {
	return {
		file: new File([], fileName),
		fileName,
		isValid: true,
		error: null,
		isLowResolution: false,
		previewUrl: null,
	};
}

describe("generateSupplementedTesserae", () => {
	it("generates enough tesserae to reach the variety recommendation and marks them as supplemented", async () => {
		vi.mocked(generateNoiseTesseraeFromState).mockResolvedValue([
			makeTessera("generated1.png"),
			makeTessera("generated2.png"),
		]);

		const tesserae = await generateSupplementedTesserae({
			sourceImage: mockSourceImage,
			adjustedTesseraSize: 10,
			varietyRecommendation: 3,
			validTesseraCount: 1,
			seed: null,
		});

		expect(generateNoiseTesseraeFromState).toHaveBeenCalledWith(
			expect.objectContaining({ generatedTesseraCount: 2 }),
		);
		expect(tesserae).toHaveLength(2);
		expect(tesserae.every((tessera) => tessera.isSupplemented)).toBe(true);
	});

	it("returns nothing when the collection already meets the recommendation", async () => {
		const tesserae = await generateSupplementedTesserae({
			sourceImage: mockSourceImage,
			adjustedTesseraSize: 10,
			varietyRecommendation: 3,
			validTesseraCount: 3,
			seed: null,
		});

		expect(tesserae).toHaveLength(0);
		expect(generateNoiseTesseraeFromState).not.toHaveBeenCalled();
	});
});
