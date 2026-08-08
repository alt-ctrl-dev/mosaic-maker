import { describe, expect, it } from "vitest";
import {
	INITIAL_WORKFLOW_STATE,
	type TesseraInfo,
	updateWorkflowWithGeneratedTesserae,
} from "./workflow-state";

// Helper function to create a test tessera
function makeTessera(fileName: string, isValid: boolean = true): TesseraInfo {
	return {
		file: new File([], fileName, { type: "image/png" }),
		fileName,
		isValid,
		error: null,
		isLowResolution: false,
		previewUrl: `data:image/jpeg;base64,${fileName}`,
	};
}

describe("workflow-state", () => {
	// ... existing tests ...

	describe("updateWorkflowWithGeneratedTesserae", () => {
		it("updates state with generated tesserae collection", () => {
			const tesserae: TesseraInfo[] = [
				makeTessera("test1.jpg", true),
				makeTessera("test2.jpg", false),
			];

			const newState = updateWorkflowWithGeneratedTesserae(
				INITIAL_WORKFLOW_STATE,
				tesserae,
			);

			expect(newState.tesserae).toEqual(tesserae);
			expect(newState.validTesseraCount).toBe(1);
			expect(newState.rejectedTesseraCount).toBe(1);
			expect(newState.totalTesseraCount).toBe(2);
			expect(newState.needsRegeneration).toBe(false);
		});

		it("should append generated tesserae to existing collection instead of replacing", () => {
			// Start with existing tesserae
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				tesserae: [
					makeTessera("existing1.jpg", true),
					makeTessera("existing2.jpg", false),
				],
				validTesseraCount: 1,
				rejectedTesseraCount: 1,
				totalTesseraCount: 2,
			};

			const newTesserae: TesseraInfo[] = [
				makeTessera("generated1.jpg", true),
				makeTessera("generated2.jpg", true),
			];

			const newState = updateWorkflowWithGeneratedTesserae(
				initialState,
				newTesserae,
			);

			// Should append instead of replace
			expect(newState.tesserae).toHaveLength(4);
			expect(newState.tesserae[0].fileName).toBe("existing1.jpg");
			expect(newState.tesserae[1].fileName).toBe("existing2.jpg");
			expect(newState.tesserae[2].fileName).toBe("generated1.jpg");
			expect(newState.tesserae[3].fileName).toBe("generated2.jpg");

			// Counts should be updated correctly
			expect(newState.validTesseraCount).toBe(3); // 1 existing + 2 new
			expect(newState.rejectedTesseraCount).toBe(1); // 1 existing, 0 new
			expect(newState.totalTesseraCount).toBe(4);
		});
	});

	// ... rest of the tests ...
});
