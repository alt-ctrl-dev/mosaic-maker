import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as exportEngine from "../engine/export";
import { renderWithWorkflow } from "../test-utils/workflow";
import { ExportPanel } from "./ExportMosaic";

const mockMosaicResult = {
	dataUrl: "data:image/png;base64,mock-image-data",
	width: 1200,
	height: 800,
};

const mockState = {
	mosaicResult: mockMosaicResult,
	exportFormat: "png" as const,
	exportQuality: 0.9,
};

describe("ExportMosaic summary and confirmation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should display summary with format, dimensions, and approximate size", () => {
		renderWithWorkflow(<ExportPanel />, mockState);

		expect(screen.getByText(/PNG · 1200×800 · ~0 KB/)).toBeInTheDocument();
	});

	it("should display confirmation after successful export", async () => {
		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue("data:image/png;base64,exported-image-data");

		renderWithWorkflow(<ExportPanel />, mockState);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		await waitFor(() => {
			expect(screen.getByText(/Delivered!/)).toBeInTheDocument();
		});

		mockExportMosaic.mockRestore();
	});

	it("should open export settings by default for jpeg format", () => {
		renderWithWorkflow(<ExportPanel />, {
			...mockState,
			exportFormat: "jpeg" as const,
		});

		expect(screen.getByText("Quality Settings")).toBeInTheDocument();
	});

	it("should open export settings by default for webp format", () => {
		renderWithWorkflow(<ExportPanel />, {
			...mockState,
			exportFormat: "webp" as const,
		});

		expect(screen.getByText("Quality Settings")).toBeInTheDocument();
	});

	it("should keep export settings closed by default for png format", () => {
		renderWithWorkflow(<ExportPanel />, mockState);

		expect(screen.queryByText("Quality Settings")).not.toBeInTheDocument();
	});
});
