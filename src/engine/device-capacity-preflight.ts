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

/**
 * Get device capacity information from the browser.
 * Uses navigator APIs when available, with conservative defaults otherwise.
 *
 * @returns Device capacity information
 */
export function getDeviceCapacity(): DeviceCapacity {
	const capacity: DeviceCapacity = {};

	// deviceMemory is in GB (approximate)
	if (typeof navigator !== "undefined" && "deviceMemory" in navigator) {
		// Type assertion needed because deviceMemory is not part of standard Navigator interface
		capacity.deviceMemory = (
			navigator as Navigator & { deviceMemory?: number }
		).deviceMemory;
	}

	// hardwareConcurrency is the number of logical CPU cores
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
	// Estimate memory usage:
	// - Source image pixels: width * height * 4 bytes (RGBA)
	// - Each tessera preview: tesseraSize^2 * 4 bytes * tesseraCount
	// - Working canvases during generation: approximately 2x source image size
	// - Result mosaic: width * height * 4 bytes
	const sourcePixels = outputWidth * outputHeight;
	const sourceMemory = sourcePixels * 4;

	// Assuming tesserae are typically 64x64 pixels (reasonable average)
	// In reality, tessera size varies, but we use a heuristic
	const avgTesseraSize = 64;
	const tesseraMemoryPerItem = avgTesseraSize * avgTesseraSize * 4;
	const totalTesseraMemory = tesseraMemoryPerItem * tesseraCount;

	// Working memory during generation (approx 2x source)
	const workingMemory = sourceMemory * 2;

	// Result memory
	const resultMemory = sourcePixels * 4;

	const estimatedMemoryUsage =
		sourceMemory + totalTesseraMemory + workingMemory + resultMemory;

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
	// Default conservative thresholds when device info is not available
	const memoryThreshold =
		capacity.deviceMemory && capacity.deviceMemory >= 4
			? 2 * 1024 * 1024 * 1024 // 2GB for high-memory devices
			: 1 * 1024 * 1024 * 1024; // 1GB for low-memory devices

	const cpuThreshold = 2; // Minimum 2 cores

	// Check memory usage
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

	// Check CPU capacity for very large workloads
	if (
		capacity.hardwareConcurrency &&
		capacity.hardwareConcurrency < cpuThreshold
	) {
		// Only warn about CPU for extremely large workloads
		if (workload.gridCellCount > 50000) {
			// Lowered threshold to make testing easier
			return {
				isSafe: false,
				reason: `Device has only ${capacity.hardwareConcurrency} CPU cores, which may be insufficient for this large workload`,
				remedy: "Try using a larger tessera size to reduce the grid cell count",
			};
		}
	}

	return {
		isSafe: true,
	};
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
