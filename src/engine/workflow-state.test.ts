import { describe, expect, it } from "vitest";
import {
	INITIAL_WORKFLOW_STATE,
	type TesseraInfo,
	updateWorkflowWithGeneratedTesserae,
} from "./workflow-state";

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
	describe("updateWorkflowWithGeneratedTesserae", () => {
		it("replaces the collection when starting from an empty state", () => {
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

		it("appends to the existing collection instead of replacing", () => {
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

			expect(newState.tesserae).toHaveLength(4);
			expect(newState.tesserae[0].fileName).toBe("existing1.jpg");
			expect(newState.tesserae[1].fileName).toBe("existing2.jpg");
			expect(newState.tesserae[2].fileName).toBe("generated1.jpg");
			expect(newState.tesserae[3].fileName).toBe("generated2.jpg");

			expect(newState.validTesseraCount).toBe(3);
			expect(newState.rejectedTesseraCount).toBe(1);
			expect(newState.totalTesseraCount).toBe(4);
		});
	});
});
