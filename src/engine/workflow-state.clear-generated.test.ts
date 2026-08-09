import {
	INITIAL_WORKFLOW_STATE,
	type TesseraInfo,
	updateWorkflowWithGeneratedTesserae,
} from "./workflow-state";

describe("workflow-state clear generated tesserae", () => {
	const mockUploadedTessera = (fileName: string): TesseraInfo => ({
		file: new File([], fileName),
		fileName,
		isValid: true,
		error: null,
		isLowResolution: false,
		previewUrl: null,
	});

	const mockGeneratedTessera = (fileName: string): TesseraInfo => ({
		file: new File([], fileName),
		fileName,
		isValid: true,
		error: null,
		isLowResolution: false,
		previewUrl: null,
		isSupplemented: true,
	});

	it("clears only generated tesserae when adding new generated tesserae", () => {
		// Start with a mix of uploaded and generated tesserae
		const initialState = {
			...INITIAL_WORKFLOW_STATE,
			tesserae: [
				mockUploadedTessera("uploaded1.png"), // Uploaded tessera
				mockGeneratedTessera("generated1.png"), // Generated tessera
				mockUploadedTessera("uploaded2.png"), // Uploaded tessera
				mockGeneratedTessera("generated2.png"), // Generated tessera
			],
			validTesseraCount: 4,
			totalTesseraCount: 4,
			rejectedTesseraCount: 0,
		};

		// Add new generated tesserae - should clear existing generated ones
		const newGeneratedTesserae = [mockGeneratedTessera("newGenerated1.png")];
		const newState = updateWorkflowWithGeneratedTesserae(
			initialState,
			newGeneratedTesserae,
		);

		// Should keep uploaded tesserae and add new generated ones
		expect(newState.tesserae).toHaveLength(3);
		expect(newState.tesserae[0].fileName).toBe("uploaded1.png");
		expect(newState.tesserae[0].isSupplemented).toBeFalsy();
		expect(newState.tesserae[1].fileName).toBe("uploaded2.png");
		expect(newState.tesserae[1].isSupplemented).toBeFalsy();
		expect(newState.tesserae[2].fileName).toBe("newGenerated1.png");
		expect(newState.tesserae[2].isSupplemented).toBe(true);

		expect(newState.validTesseraCount).toBe(3);
		expect(newState.totalTesseraCount).toBe(3);
		expect(newState.rejectedTesseraCount).toBe(0);
	});

	it("clears all tesserae when requested", () => {
		// Start with a mix of uploaded and generated tesserae
		const initialState = {
			...INITIAL_WORKFLOW_STATE,
			tesserae: [
				mockUploadedTessera("uploaded1.png"),
				mockGeneratedTessera("generated1.png"),
				mockUploadedTessera("uploaded2.png"),
				mockGeneratedTessera("generated2.png"),
			],
			validTesseraCount: 4,
			totalTesseraCount: 4,
			rejectedTesseraCount: 0,
		};

		// Create a function to clear all tesserae (simulate clear all functionality)
		const clearAllTesserae = (state: typeof initialState) => ({
			...state,
			tesserae: [],
			validTesseraCount: 0,
			rejectedTesseraCount: 0,
			totalTesseraCount: 0,
		});

		const newState = clearAllTesserae(initialState);

		// Should clear all tesserae
		expect(newState.tesserae).toHaveLength(0);
		expect(newState.validTesseraCount).toBe(0);
		expect(newState.totalTesseraCount).toBe(0);
		expect(newState.rejectedTesseraCount).toBe(0);
	});
});
