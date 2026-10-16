import { renderBrick } from "./brick";
import type { ExportFormat } from "./export";
import { generateNoiseTesseraeFromState } from "./generate-noise-tesserae-helper";
import type { SourceImageInfo } from "./image-processing";
import type { MosaicResult } from "./mosaic-engine";

export type { MosaicResult };

/**
 * Settings for mosaic export.
 */
export interface ExportSettings {
	exportFormat: ExportFormat;
	exportQuality: number;
	exportBackgroundColor: string;
}

/**
 * Available mosaic generation modes.
 */
export type MosaicMode = "photomosaic" | "brick";

/**
 * Information about a tessera that has been processed for the mosaic.
 *
 * Photomosaic tesserae carry an uploaded or generated image via
 * {@link TesseraInfo.file} and {@link TesseraInfo.previewUrl}. Brick-mode
 * tesserae are synthetic: they carry only a flat {@link TesseraInfo.color}
 * and have no backing image, so the generation engine renders them as a
 * solid colour fill.
 */
export interface TesseraInfo {
	/** Backing image file for photomosaic tesserae; absent for synthetic brick tesserae. */
	file?: File;
	fileName: string;
	isValid: boolean;
	error: string | null;
	isLowResolution: boolean;
	previewUrl: string | null;
	/** Whether the tessera is supplemented (generated) */
	isSupplemented?: boolean;
	/** Flat hex colour for synthetic brick-mode tesserae; absent for photomosaic tesserae. */
	color?: string;
}

/**
 * Create a synthetic tessera representing a single flat brick colour.
 *
 * Synthetic tesserae have no backing image file; the generation engine fills
 * the tessera with {@link TesseraInfo.color} instead of drawing an image.
 *
 * @param color - Hex colour value (e.g. `#FF0000`) for the brick tessera
 * @returns A valid synthetic tessera for the given colour
 */
export function createBrickTessera(color: string): TesseraInfo {
	return {
		fileName: `brick-${color}`,
		isValid: true,
		error: null,
		isLowResolution: false,
		previewUrl: renderBrick(color),
		color,
	};
}

/**
 * Create synthetic tesserae for a collection of brick colours.
 *
 * @param colors - Hex colour values selected by the user
 * @returns One synthetic tessera per colour
 */
export function createBrickTesserae(colors: string[]): TesseraInfo[] {
	return colors.map(createBrickTessera);
}

/**
 * Snapshot of the mosaic creation workflow. Live state lives in the
 * workflow atoms; this shape seeds a store via hydration and feeds the
 * engine helpers.
 */
export interface WorkflowState {
	currentStep: WorkflowStep;
	/** The furthest step the user has completed */
	furthestCompletedStep: WorkflowStep;
	/** Selected mosaic generation mode */
	mode: MosaicMode;
	sourceImage: SourceImageInfo | null;
	requestedTesseraSize: number | null;
	adjustedTesseraSize: number | null;
	isCoarseGrid: boolean;
	hasValidSourceDimensions: boolean;
	sourceImageError: string | null;
	/** Collection of uploaded or generated tesserae */
	tesserae: TesseraInfo[];
	validTesseraCount: number;
	rejectedTesseraCount: number;
	totalTesseraCount: number;
	isLowVarietyCollection: boolean;
	/** The recommended number of tesserae for good variety */
	varietyRecommendation: number | null;
	hasAcceptedSupplementation: boolean;
	/** Seed for generating reproducible noise tesserae */
	seed: number | null;
	generatedTesseraCount: number | null;
	/** The generated mosaic result, set after mosaic generation completes */
	mosaicResult: MosaicResult | null;
	exportFormat: ExportFormat;
	/** Quality setting for JPEG/WebP exports (0.0 - 1.0) */
	exportQuality: number;
	exportBackgroundColor: string;
}

/**
 * Workflow steps.
 */
export enum WorkflowStep {
	CHOOSE_SOURCE_IMAGE,
	PICK_TILE_SIZE,
	PICK_TILES,
	GENERATE_AND_PREVIEW,
	EXPORT_MOSAIC,
}

/**
 * Display titles for each workflow step, ordered by {@link WorkflowStep}.
 */
export const WORKFLOW_STEP_TITLES = [
	"Choose source image",
	"Build tiles",
	"Generate and preview",
	"Export mosaic",
] as const;

/**
 * Maximum value for seed generation.
 */
export const SEED_MAX = 1_000_000;

/**
 * Calculate the recommended number of tesserae for good variety.
 * 10% of grid cells, capped at 100.
 */
export function getVarietyRecommendation(gridCellCount: number): number {
	const recommendation = Math.max(1, Math.round(gridCellCount * 0.1));
	return Math.min(recommendation, 100);
}

/**
 * Check whether the valid tessera count falls below the variety recommendation
 * (10% of grid cells, capped at 100).
 *
 * @returns `true` when {@link validTesseraCount} is less than the recommended
 *   minimum for the given {@link gridCellCount}.
 */
export function checkLowVariety(
	validTesseraCount: number,
	gridCellCount: number,
): boolean {
	const recommendation = getVarietyRecommendation(gridCellCount);
	return validTesseraCount < recommendation;
}

/**
 * Inputs for supplementing a tessera collection with generated tiles.
 */
export interface SupplementationParams {
	sourceImage: SourceImageInfo;
	adjustedTesseraSize: number;
	/** The recommended number of tesserae for good variety */
	varietyRecommendation: number;
	validTesseraCount: number;
	/** Seed for generating reproducible noise tesserae */
	seed: number | null;
}

/**
 * Generate supplemental tesserae to reach the variety recommendation.
 * Generates enough tesserae to bring the total valid count up to the
 * recommendation.
 *
 * @param params - Source image, tessera size, variety target, and seed
 * @returns Promise resolving to an array of generated tesserae marked as supplemented
 */
export async function generateSupplementedTesserae(
	params: SupplementationParams,
): Promise<TesseraInfo[]> {
	const neededCount = Math.max(
		0,
		params.varietyRecommendation - params.validTesseraCount,
	);

	if (neededCount <= 0) {
		return [];
	}

	try {
		const tesserae = await generateNoiseTesseraeFromState({
			sourceImage: params.sourceImage,
			adjustedTesseraSize: params.adjustedTesseraSize,
			generatedTesseraCount: neededCount,
			seed: params.seed ?? Math.floor(Math.random() * SEED_MAX),
		});
		return tesserae.map((tessera) => ({
			...tessera,
			isSupplemented: true,
		}));
	} catch (error) {
		console.error("Error generating supplemented tesserae:", error);
		return [];
	}
}
