import { sampleCellGrids } from "./source-sampling";

/** Request to sample one band of the source image. */
interface SampleBandRequest {
	band: ImageBitmap;
	tesseraSize: number;
}

/**
 * Samples the color grid of every cell in one band of the source image so the
 * mosaic worker can process tesserae while the source is analysed in parallel.
 */
self.onmessage = (event: MessageEvent<SampleBandRequest>) => {
	const { band, tesseraSize } = event.data;
	try {
		const grids = sampleCellGrids(band, tesseraSize);
		band.close();
		self.postMessage({ type: "result", grids }, { transfer: [grids.buffer] });
	} catch (error) {
		self.postMessage({
			type: "error",
			message: error instanceof Error ? error.message : String(error),
		});
	}
};
