/**
 * Device capacity information used for preflight checks.
 */
export interface DeviceCapacity {
	/** Device memory in GB (approximate) */
	deviceMemory?: number;
	/** Number of logical CPU cores */
	hardwareConcurrency?: number;
}

/**
 * Workload estimation for mosaic generation.
 */
export interface WorkloadEstimate {
	/** Number of grid cells in the mosaic */
	gridCellCount: number;
	/** Number of tesserae to be used */
	tesseraCount: number;
	/** Output mosaic dimensions in pixels */
	outputPixels: number;
	/** Estimated memory usage in bytes */
	estimatedMemoryUsage: number;
}

/**
 * Result of a device capacity preflight check.
 */
export interface PreflightResult {
	/** Whether the workload is considered safe for the device */
	isSafe: boolean;
	/** Explanation of the decision */
	reason?: string;
	/** Suggested remedy if the workload is unsafe */
	remedy?: string;
}

/** Bytes per pixel for RGBA image data used in memory estimation. */
const BYTES_PER_PIXEL = 4;

/** Heuristic average tessera size in pixels for memory estimation. */
const AVG_TESSERA_SIZE = 64;

/** Device memory threshold (GB) separating high-memory from low-memory devices. */
const HIGH_MEMORY_THRESHOLD_GB = 4;

/** Memory limit for high-memory devices (2 GB). */
const MEMORY_LIMIT_HIGH = 2 * 1024 * 1024 * 1024;

/** Memory limit for low-memory devices (1 GB). */
const MEMORY_LIMIT_LOW = 1 * 1024 * 1024 * 1024;

/** Minimum CPU cores for acceptable mosaic generation performance. */
const MIN_CPU_CORES = 2;

/** Grid cell count above which a core-count check fires on low-core devices. */
const GRID_CELL_CPU_THRESHOLD = 50000;

/**
 * Get device capacity information from the browser.
 * Uses navigator APIs when available, with conservative defaults otherwise.
 *
 * @returns Device capacity information
 */
export function getDeviceCapacity(): DeviceCapacity {
	const capacity: DeviceCapacity = {};

	if (typeof navigator !== "undefined" && "deviceMemory" in navigator) {
		capacity.deviceMemory = (
			navigator as Navigator & { deviceMemory?: number }
		).deviceMemory;
	}

	if (typeof navigator !== "undefined" && "hardwareConcurrency" in navigator) {
		capacity.hardwareConcurrency = navigator.hardwareConcurrency;
	}

	return capacity;
}

/**
 * Estimate the workload for mosaic generation based on inputs.
 *
 * @param gridCellCount - Number of grid cells in the mosaic
 * @param tesseraCount - Number of tesserae to be used
 * @param outputWidth - Width of the output mosaic in pixels
 * @param outputHeight - Height of the output mosaic in pixels
 * @returns Workload estimate including memory usage
 */
export function estimateWorkload(
	gridCellCount: number,
	tesseraCount: number,
	outputWidth: number,
	outputHeight: number,
): WorkloadEstimate {
	// Memory model: source image + result mosaic + working canvases (~2x source)
	// + tessera previews (estimated at AVG_TESSERA_SIZE² × BYTES_PER_PIXEL each)
	const pixelCount = outputWidth * outputHeight;
	const imageMemory = pixelCount * BYTES_PER_PIXEL;
	const workingMemory = imageMemory * 2;

	const tesseraMemoryPerItem =
		AVG_TESSERA_SIZE * AVG_TESSERA_SIZE * BYTES_PER_PIXEL;
	const totalTesseraMemory = tesseraMemoryPerItem * tesseraCount;

	const estimatedMemoryUsage =
		imageMemory * 2 + totalTesseraMemory + workingMemory;

	return {
		gridCellCount,
		tesseraCount,
		outputPixels: outputWidth * outputHeight,
		estimatedMemoryUsage,
	};
}

/**
 * Check if a workload is safe for the given device capacity.
 *
 * Conservative thresholds based on measured evidence:
 * - Memory threshold: 1GB for devices with < 4GB RAM, 2GB for devices with >= 4GB RAM
 * - CPU threshold: Minimum 2 cores for acceptable performance
 *
 * @param workload - The estimated workload
 * @param capacity - The device capacity information
 * @returns Preflight result indicating if the workload is safe
 */
export function checkDeviceCapacity(
	workload: WorkloadEstimate,
	capacity: DeviceCapacity,
): PreflightResult {
	const isHighMemory =
		capacity.deviceMemory !== undefined &&
		capacity.deviceMemory >= HIGH_MEMORY_THRESHOLD_GB;
	const memoryThreshold = isHighMemory ? MEMORY_LIMIT_HIGH : MEMORY_LIMIT_LOW;

	if (workload.estimatedMemoryUsage > memoryThreshold) {
		const memoryMB = Math.round(workload.estimatedMemoryUsage / (1024 * 1024));
		const thresholdMB = Math.round(memoryThreshold / (1024 * 1024));

		return {
			isSafe: false,
			reason: `Estimated memory usage (${memoryMB} MB) exceeds device capacity threshold (${thresholdMB} MB)`,
			remedy:
				"Try using a larger tessera size to reduce the grid cell count, or use fewer tesserae",
		};
	}

	if (
		capacity.hardwareConcurrency !== undefined &&
		capacity.hardwareConcurrency < MIN_CPU_CORES &&
		workload.gridCellCount > GRID_CELL_CPU_THRESHOLD
	) {
		return {
			isSafe: false,
			reason: `Device has only ${capacity.hardwareConcurrency} CPU cores, which may be insufficient for this large workload`,
			remedy: "Try using a larger tessera size to reduce the grid cell count",
		};
	}

	return { isSafe: true };
}

/**
 * Run a preflight check to determine if a mosaic generation workload is safe for the device.
 *
 * @param gridCellCount - Number of grid cells in the mosaic
 * @param tesseraCount - Number of tesserae to be used
 * @param outputWidth - Width of the output mosaic in pixels
 * @param outputHeight - Height of the output mosaic in pixels
 * @param capacity - Optional device capacity information (for testing)
 * @returns Preflight result indicating if the workload is safe
 */
export function runDeviceCapacityPreflight(
	gridCellCount: number,
	tesseraCount: number,
	outputWidth: number,
	outputHeight: number,
	capacity?: DeviceCapacity,
): PreflightResult {
	const deviceCapacity = capacity || getDeviceCapacity();
	const workload = estimateWorkload(
		gridCellCount,
		tesseraCount,
		outputWidth,
		outputHeight,
	);
	return checkDeviceCapacity(workload, deviceCapacity);
}
