import type { TesseraInfo, WorkflowState } from "./workflow-state";
import {
	generateNoiseTesserae,
	calculateRecommendedTesseraCount,
} from "./noise-tessera-generation";
import { calculateGridCellCount } from "./tessera-sizing";

export async function generateNoiseTesseraeFromState(
	state: WorkflowState,
): Promise<TesseraInfo[]> {
	if (!state.sourceImage || !state.adjustedTesseraSize) {
		throw new Error("Source image and adjusted tessera size are required");
	}

	const gridCellCount = calculateGridCellCount(
		state.adjustedTesseraSize,
		state.sourceImage.width,
		state.sourceImage.height,
	);

	const requestedCount =
		state.generatedTesseraCount ??
		calculateRecommendedTesseraCount(gridCellCount);
	const tesseraCount = Math.max(1, Math.min(requestedCount, gridCellCount));

	const seed = state.seed ?? Math.floor(Math.random() * 1000000);

	return generateNoiseTesserae(
		state.sourceImage,
		tesseraCount,
		state.adjustedTesseraSize,
		seed,
	);
}
