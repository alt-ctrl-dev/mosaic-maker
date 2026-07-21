import type { SourceImageInfo } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";

function seededRandom(seed: number): number {
	seed = Math.abs(seed);
	seed = ((seed >> 16) ^ seed) * 0x45d9f3b;
	seed = ((seed >> 16) ^ seed) * 0x45d9f3b;
	seed = (seed >> 16) ^ seed;
	return seed / 0x7fffffff;
}

/** 10% of grid cells, capped at 100. */
export function calculateRecommendedTesseraCount(
	gridCellCount: number,
): number {
	const recommended = Math.max(1, Math.floor(gridCellCount * 0.1));
	return Math.min(recommended, 100);
}

export async function generateNoiseTesserae(
	_sourceImage: SourceImageInfo,
	count: number,
	_size: number,
	seed: number,
): Promise<TesseraInfo[]> {
	const tesserae: TesseraInfo[] = [];

	for (let i = 0; i < count; i++) {
		const randomValue = seededRandom(seed + i);
		const style = randomValue > 0.5 ? "smooth" : "sharp";
		const id = `generated-${i}-${style}-${seed}`;

		tesserae.push({
			file: new File([id], `${id}.png`, { type: "image/png" }),
			fileName: `${id}.png`,
			isValid: true,
			error: null,
			isLowResolution: false,
			previewUrl: `data:image/png;base64,${btoa(id)}`,
		});
	}

	return tesserae;
}
