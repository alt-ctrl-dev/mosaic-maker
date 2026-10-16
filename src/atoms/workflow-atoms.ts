import { atom, createStore } from "jotai";
import type { ExportFormat } from "../engine/export";
import type { SourceImageInfo } from "../engine/image-processing";
import type { MosaicResult } from "../engine/mosaic-engine";
import { resizeTesserae } from "../engine/tessera-processing";
import {
	calculateAdjustedTesseraSize,
	calculateGridCellCount,
	hasValidTesseraSizes,
	isCoarseGrid,
} from "../engine/tessera-sizing";
import {
	generateSupplementedTesserae,
	getVarietyRecommendation,
	type MosaicMode,
	SEED_MAX,
	type TesseraInfo,
	type WorkflowState,
	WorkflowStep,
} from "../engine/workflow-state";
import { trackError, trackEvent } from "../telemetry";

/** Fallback tessera size when no adjusted size has been calculated yet. */
export const DEFAULT_TESSERA_SIZE = 16;

const WORKFLOW_STEP_NAMES = [
	"choose_source_image",
	"pick_tile_size",
	"pick_tiles",
	"generate_and_preview",
	"export_mosaic",
] as const;

/** Count of workflow steps derived from the enum's string-key members. */
const WORKFLOW_STEP_COUNT = Object.keys(WorkflowStep).filter((key) =>
	Number.isNaN(Number(key)),
).length;

// ---------------------------------------------------------------------------
// Source atoms — the only mutable facts the workflow stores.
// ---------------------------------------------------------------------------

/** Selected mosaic generation mode. */
export const modeAtom = atom<MosaicMode>("photomosaic");
/** The chosen source image, or null before selection. */
export const sourceImageAtom = atom<SourceImageInfo | null>(null);
/** User-facing error from source image selection or processing. */
export const sourceImageErrorAtom = atom<string | null>(null);
/** Tessera pixel size requested by the user, before adjustment. */
export const requestedTesseraSizeAtom = atom<number | null>(null);
/** Collection of uploaded, generated, or synthetic tesserae. */
export const tesseraeAtom = atom<TesseraInfo[]>([]);
/** Whether the user accepted supplementing with generated tesserae. */
export const hasAcceptedSupplementationAtom = atom(false);
/** Seed for reproducible noise tessera generation. */
export const seedAtom = atom<number | null>(null);
/** Explicit count of tesserae to generate. */
export const generatedTesseraCountAtom = atom<number | null>(null);
/** The generated mosaic result, set after generation completes. */
export const mosaicResultAtom = atom<MosaicResult | null>(null);
/** The workflow step currently displayed. */
export const currentStepAtom = atom<WorkflowStep>(
	WorkflowStep.CHOOSE_SOURCE_IMAGE,
);
/** The furthest step the user has completed. */
export const furthestCompletedStepAtom = atom<WorkflowStep>(
	WorkflowStep.CHOOSE_SOURCE_IMAGE,
);
export const exportFormatAtom = atom<ExportFormat>("png");
/** Quality setting for JPEG/WebP exports (0.0 - 1.0). */
export const exportQualityAtom = atom(0.9);
export const exportBackgroundColorAtom = atom("#ffffff");

// ---------------------------------------------------------------------------
// Derived atoms — recomputed from source atoms, never stored.
// ---------------------------------------------------------------------------

/** Whether the source image dimensions allow any valid tessera size. */
export const hasValidSourceDimensionsAtom = atom((get) => {
	const sourceImage = get(sourceImageAtom);
	return sourceImage
		? hasValidTesseraSizes(sourceImage.width, sourceImage.height)
		: false;
});

/** The requested size clamped to the valid range for the source image. */
export const adjustedTesseraSizeAtom = atom<number | null>((get) => {
	const sourceImage = get(sourceImageAtom);
	const requestedSize = get(requestedTesseraSizeAtom);
	if (
		!sourceImage ||
		requestedSize === null ||
		!get(hasValidSourceDimensionsAtom)
	) {
		return null;
	}
	return calculateAdjustedTesseraSize(
		requestedSize,
		sourceImage.width,
		sourceImage.height,
	);
});

/** Total grid cells for the current source image and tessera size. */
export const gridCellCountAtom = atom<number | null>((get) => {
	const sourceImage = get(sourceImageAtom);
	const adjustedSize = get(adjustedTesseraSizeAtom);
	if (!sourceImage || adjustedSize === null) return null;
	return calculateGridCellCount(
		adjustedSize,
		sourceImage.width,
		sourceImage.height,
	);
});

/** Whether the current grid is too coarse for a good mosaic. */
export const isCoarseGridAtom = atom((get) => {
	const cellCount = get(gridCellCountAtom);
	return cellCount !== null && isCoarseGrid(cellCount);
});

export const validTesseraCountAtom = atom(
	(get) => get(tesseraeAtom).filter((tessera) => tessera.isValid).length,
);
export const rejectedTesseraCountAtom = atom(
	(get) => get(tesseraeAtom).filter((tessera) => !tessera.isValid).length,
);
export const totalTesseraCountAtom = atom((get) => get(tesseraeAtom).length);

/**
 * Recommended number of tesserae for good variety. Brick mode uses a fixed
 * palette of flat colours, so variety recommendations don't apply there.
 */
export const varietyRecommendationAtom = atom<number | null>((get) => {
	const cellCount = get(gridCellCountAtom);
	if (get(modeAtom) === "brick" || cellCount === null) return null;
	return getVarietyRecommendation(cellCount);
});

/** Whether the valid tessera count falls below the variety recommendation. */
export const isLowVarietyCollectionAtom = atom((get) => {
	const recommendation = get(varietyRecommendationAtom);
	if (recommendation === null) return false;
	return get(validTesseraCountAtom) < recommendation;
});

/** Tessera size to process uploads with: adjusted size or the default. */
export const resolvedTesseraSizeAtom = atom(
	(get) => get(adjustedTesseraSizeAtom) ?? DEFAULT_TESSERA_SIZE,
);

// ---------------------------------------------------------------------------
// Write atoms — multi-atom transitions. Components never need callbacks to
// reach them: `useSetAtom` hands out a stable setter.
// ---------------------------------------------------------------------------

/** Advance the current step and furthest completed step to at least `step`. */
const advanceToStepAtom = atom(null, (get, set, step: WorkflowStep) => {
	set(currentStepAtom, step);
	set(
		furthestCompletedStepAtom,
		Math.max(get(furthestCompletedStepAtom), step),
	);
});

/** Navigate to a completed step; forward jumps beyond progress are blocked. */
export const goToStepAtom = atom(null, (get, set, step: number) => {
	const clamped = Math.max(0, Math.min(step, WORKFLOW_STEP_COUNT - 1));
	if (clamped <= get(furthestCompletedStepAtom)) {
		const fromStep = get(currentStepAtom);
		trackEvent("workflow_step_navigate", {
			fromStep: WORKFLOW_STEP_NAMES[fromStep] || `step_${fromStep}`,
			toStep: WORKFLOW_STEP_NAMES[clamped] || `step_${clamped}`,
			isForward: clamped > fromStep,
			isBackward: clamped < fromStep,
		});
		set(currentStepAtom, clamped);
	}
});

/** Select the mosaic mode; changing it resets the tessera collection. */
export const selectModeAtom = atom(null, (get, set, mode: MosaicMode) => {
	if (get(modeAtom) === mode) return;
	set(modeAtom, mode);
	// Tesserae from the other mode don't carry over; keep the source image.
	set(tesseraeAtom, []);
	set(hasAcceptedSupplementationAtom, false);
	set(seedAtom, null);
	set(generatedTesseraCountAtom, null);
	set(mosaicResultAtom, null);
});

/** Select and validate the source image, advancing on valid dimensions. */
export const selectSourceImageAtom = atom(
	null,
	(_get, set, sourceImage: SourceImageInfo) => {
		set(sourceImageAtom, sourceImage);
		if (hasValidTesseraSizes(sourceImage.width, sourceImage.height)) {
			set(sourceImageErrorAtom, null);
			set(advanceToStepAtom, WorkflowStep.PICK_TILE_SIZE);
		} else {
			set(
				sourceImageErrorAtom,
				"The selected image is too small (both dimensions must be at least 8 pixels). Please select a different image.",
			);
			set(currentStepAtom, WorkflowStep.CHOOSE_SOURCE_IMAGE);
		}
	},
);

/** Record a source image selection or processing failure. */
export const reportSourceErrorAtom = atom(
	null,
	(_get, set, errorMessage: string) => {
		set(sourceImageAtom, null);
		set(sourceImageErrorAtom, errorMessage);
	},
);

/**
 * Commit a requested tessera size, then resize any existing tesserae to it.
 * Ignored until a source image with valid dimensions is present. Does not
 * change the step; leaving the size step goes through advanceFromSizeAtom.
 */
export const commitTesseraSizeAtom = atom(
	null,
	async (get, set, size: number) => {
		if (!get(sourceImageAtom) || !get(hasValidSourceDimensionsAtom)) return;
		set(requestedTesseraSizeAtom, size);

		const tesserae = get(tesseraeAtom);
		if (tesserae.length === 0) return;
		try {
			set(tesseraeAtom, await resizeTesserae(tesserae, size));
		} catch (error) {
			console.error("Error resizing tesserae:", error);
			trackError("tesserae_resize", error, {
				tesseraCount: tesserae.length,
				targetSize: size,
			});
		}
	},
);

/** Replace the tessera collection (uploads and brick palettes). */
export const replaceTesseraeAtom = atom(
	null,
	(_get, set, tesserae: TesseraInfo[]) => {
		set(tesseraeAtom, tesserae);
		set(advanceToStepAtom, WorkflowStep.PICK_TILES);
	},
);

/**
 * Append newly generated tesserae, discarding previously generated ones
 * while keeping uploaded tesserae.
 */
export const appendGeneratedTesseraeAtom = atom(
	null,
	(get, set, tesserae: TesseraInfo[]) => {
		const kept = get(tesseraeAtom).filter((tessera) => !tessera.isSupplemented);
		set(tesseraeAtom, [...kept, ...tesserae]);
	},
);

/** Remove the tessera at the given index. */
export const removeTesseraAtom = atom(null, (get, set, index: number) => {
	const tesserae = get(tesseraeAtom);
	if (index < 0 || index >= tesserae.length) return;
	set(
		tesseraeAtom,
		tesserae.filter((_, i) => i !== index),
	);
});

/** Clear the whole tessera collection. */
export const clearTesseraeAtom = atom(null, (_get, set) => {
	set(tesseraeAtom, []);
});

/**
 * Generate supplemental tesserae up to the variety recommendation and append
 * them. Marks supplementation as accepted even when nothing is added, so the
 * prompt is not repeated.
 */
export const acceptSupplementationAtom = atom(null, async (get, set) => {
	const sourceImage = get(sourceImageAtom);
	const adjustedTesseraSize = get(adjustedTesseraSizeAtom);
	const varietyRecommendation = get(varietyRecommendationAtom);
	if (
		!sourceImage ||
		adjustedTesseraSize === null ||
		varietyRecommendation === null
	) {
		return;
	}

	const supplemented = await generateSupplementedTesserae({
		sourceImage,
		adjustedTesseraSize,
		varietyRecommendation,
		validTesseraCount: get(validTesseraCountAtom),
		seed: get(seedAtom) ?? Math.floor(Math.random() * SEED_MAX),
	});

	set(tesseraeAtom, [...get(tesseraeAtom), ...supplemented]);
	set(hasAcceptedSupplementationAtom, true);
});

/** Store a finished mosaic and unlock the export step. */
export const completeMosaicAtom = atom(
	null,
	(get, set, mosaicResult: MosaicResult) => {
		set(mosaicResultAtom, mosaicResult);
		set(
			furthestCompletedStepAtom,
			Math.max(get(furthestCompletedStepAtom), WorkflowStep.EXPORT_MOSAIC),
		);
	},
);

/** Discard an incomplete or failed mosaic result. */
export const discardMosaicAtom = atom(null, (_get, set) => {
	set(mosaicResultAtom, null);
});

/** Advance from tile size selection to the tile picking step. */
export const advanceFromSizeAtom = atom(null, (_get, set) => {
	set(advanceToStepAtom, WorkflowStep.PICK_TILES);
});

/** Advance from tessera review to the generate-and-preview step. */
export const advanceFromReviewAtom = atom(null, (_get, set) => {
	set(advanceToStepAtom, WorkflowStep.GENERATE_AND_PREVIEW);
});

// ---------------------------------------------------------------------------
// Store hydration — used by tests to seed a store from a state snapshot.
// ---------------------------------------------------------------------------

/**
 * Seed a fresh store's atoms from a (partial) {@link WorkflowState} snapshot.
 * Fields absent from the snapshot keep each atom's own default. Stored
 * derived fields are ignored except `adjustedTesseraSize`, which seeds
 * `requestedTesseraSize` when that is absent so the derived value matches
 * the snapshot.
 */
export function hydrateWorkflowStore(
	store: ReturnType<typeof createStore>,
	state: Partial<WorkflowState>,
): void {
	if (state.mode !== undefined) store.set(modeAtom, state.mode);
	if (state.sourceImage !== undefined)
		store.set(sourceImageAtom, state.sourceImage);
	if (state.sourceImageError !== undefined)
		store.set(sourceImageErrorAtom, state.sourceImageError);
	const requestedSize = state.requestedTesseraSize ?? state.adjustedTesseraSize;
	if (requestedSize !== undefined)
		store.set(requestedTesseraSizeAtom, requestedSize);
	if (state.tesserae !== undefined) store.set(tesseraeAtom, state.tesserae);
	if (state.hasAcceptedSupplementation !== undefined)
		store.set(hasAcceptedSupplementationAtom, state.hasAcceptedSupplementation);
	if (state.seed !== undefined) store.set(seedAtom, state.seed);
	if (state.generatedTesseraCount !== undefined)
		store.set(generatedTesseraCountAtom, state.generatedTesseraCount);
	if (state.mosaicResult !== undefined)
		store.set(mosaicResultAtom, state.mosaicResult);
	if (state.currentStep !== undefined)
		store.set(currentStepAtom, state.currentStep);
	if (state.furthestCompletedStep !== undefined)
		store.set(furthestCompletedStepAtom, state.furthestCompletedStep);
	if (state.exportFormat !== undefined)
		store.set(exportFormatAtom, state.exportFormat);
	if (state.exportQuality !== undefined)
		store.set(exportQualityAtom, state.exportQuality);
	if (state.exportBackgroundColor !== undefined)
		store.set(exportBackgroundColorAtom, state.exportBackgroundColor);
}

/** Create a store pre-seeded from a (partial) workflow state snapshot. */
export function createWorkflowStore(
	state: Partial<WorkflowState> = {},
): ReturnType<typeof createStore> {
	const store = createStore();
	hydrateWorkflowStore(store, state);
	return store;
}
