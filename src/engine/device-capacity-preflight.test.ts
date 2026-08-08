import {
	estimateWorkload,
	checkDeviceCapacity,
	runDeviceCapacityPreflight,
	type DeviceCapacity,
	type WorkloadEstimate,
} from "./device-capacity-preflight";

import { describe, it, expect } from "vitest";

describe("device-capacity-preflight", () => {
	describe("estimateWorkload", () => {
		it("should estimate memory usage correctly for a moderate workload", () => {
			const workload = estimateWorkload(1000, 50, 800, 600);

			expect(workload).toEqual({
				gridCellCount: 1000,
				tesseraCount: 50,
				outputPixels: 480000,
				estimatedMemoryUsage: expect.any(Number),
			});

			// 800×600×4 = 1,920,000 (image) × 4 passes + 50 × 64² × 4 (tesserae)
			// = 7,680,000 + 819,200 = 8,499,200
			expect(workload.estimatedMemoryUsage).toBeGreaterThan(8_000_000);
			expect(workload.estimatedMemoryUsage).toBeLessThan(10_000_000);
		});

		it("should estimate higher memory usage for larger workloads", () => {
			const workload1 = estimateWorkload(1000, 50, 800, 600);
			const workload2 = estimateWorkload(4000, 100, 1600, 1200);

			expect(workload2.estimatedMemoryUsage).toBeGreaterThan(
				workload1.estimatedMemoryUsage,
			);
		});
	});

	describe("checkDeviceCapacity", () => {
		const baseWorkload: WorkloadEstimate = {
			gridCellCount: 1000,
			tesseraCount: 50,
			outputPixels: 480000,
			estimatedMemoryUsage: 8500000, // ~8.1 MB
		};

		it("should allow safe workloads on high-memory devices", () => {
			const capacity: DeviceCapacity = {
				deviceMemory: 8,
				hardwareConcurrency: 4,
			};
			const result = checkDeviceCapacity(baseWorkload, capacity);

			expect(result).toEqual({ isSafe: true });
		});

		it("should allow safe workloads when device memory info is unavailable", () => {
			const capacity: DeviceCapacity = { hardwareConcurrency: 4 };
			const result = checkDeviceCapacity(baseWorkload, capacity);

			expect(result).toEqual({ isSafe: true });
		});

		it("should reject workloads that exceed memory threshold on low-memory devices", () => {
			const workload: WorkloadEstimate = {
				...baseWorkload,
				estimatedMemoryUsage: 1.5 * 1024 * 1024 * 1024, // 1.5 GB
			};
			const capacity: DeviceCapacity = {
				deviceMemory: 2,
				hardwareConcurrency: 4,
			};
			const result = checkDeviceCapacity(workload, capacity);

			expect(result.isSafe).toBe(false);
			expect(result.reason).toContain("memory usage");
			expect(result.remedy).toContain("larger tessera size");
		});

		it("should reject extremely large workloads on single-core devices", () => {
			const workload: WorkloadEstimate = {
				...baseWorkload,
				gridCellCount: 150_000,
			};
			const capacity: DeviceCapacity = {
				deviceMemory: 8,
				hardwareConcurrency: 1,
			};
			const result = checkDeviceCapacity(workload, capacity);

			expect(result.isSafe).toBe(false);
			expect(result.reason).toContain("CPU cores");
			expect(result.remedy).toContain("larger tessera size");
		});

		it("should allow large workloads on multi-core devices", () => {
			const workload: WorkloadEstimate = {
				...baseWorkload,
				gridCellCount: 150_000,
			};
			const capacity: DeviceCapacity = {
				deviceMemory: 8,
				hardwareConcurrency: 4,
			};
			const result = checkDeviceCapacity(workload, capacity);

			expect(result).toEqual({ isSafe: true });
		});
	});

	describe("runDeviceCapacityPreflight", () => {
		it("should return safe result for moderate workloads", () => {
			const result = runDeviceCapacityPreflight(1000, 50, 800, 600, {
				deviceMemory: 4,
				hardwareConcurrency: 2,
			});

			expect(result).toEqual({ isSafe: true });
		});

		it("should return unsafe result with explanation for excessive workloads", () => {
			const result = runDeviceCapacityPreflight(60_000, 500, 3000, 2000, {
				deviceMemory: 2,
				hardwareConcurrency: 1,
			});

			expect(result.isSafe).toBe(false);
			expect(result.reason).toBeDefined();
			expect(result.remedy).toBeDefined();
		});
	});
});
