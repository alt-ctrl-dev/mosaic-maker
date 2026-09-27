import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportMosaic } from "./ExportMosaic";
import * as exportEngine from "../engine/export";
import { INITIAL_WORKFLOW_STATE, WorkflowStep } from "../engine/workflow-state";

// Mock the workflow reducer
const mockDispatch = vi.fn();

// Mock data for testing
const mockMosaicResult = {
	dataUrl: "data:image/png;base64,mock-image-data",
	width: 100,
	height: 100,
};

const mockState = {
	...INITIAL_WORKFLOW_STATE,
	currentStep: WorkflowStep.EXPORT_MOSAIC,
	mosaicResult: mockMosaicResult,
	exportFormat: "png" as const,
	exportQuality: 0.9,
};

describe("ExportMosaic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		// Reset navigator.userAgent
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
		});
		// Reset window.open
		window.open = vi.fn();
	});

	it("should render export preview when mosaic result is available", () => {
		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		expect(screen.getByText("Preview")).toBeInTheDocument();
		expect(screen.getByAltText("Generated mosaic")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Download" }),
		).toBeInTheDocument();
	});

	it("should trigger download when Download button is clicked", async () => {
		// Mock the exportMosaic function to return a data URL
		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue("data:image/png;base64,exported-image-data");

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		await waitFor(() => {
			expect(mockExportMosaic).toHaveBeenCalledWith(
				mockMosaicResult.dataUrl,
				mockMosaicResult.width,
				mockMosaicResult.height,
				"png",
				0.9,
			);
		});

		// Clean up
		mockExportMosaic.mockRestore();
	});

	it("should show error message when export fails", async () => {
		// Mock the exportMosaic function to throw an error
		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockRejectedValue(new Error("Export failed"));

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		await waitFor(() => {
			expect(screen.getByText("Export failed")).toBeInTheDocument();
		});

		// Clean up
		mockExportMosaic.mockRestore();
	});

	it("should open image in new tab for iOS devices", async () => {
		// Mock navigator.userAgent to simulate iOS
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
		});

		// Mock window.open
		const mockOpen = vi.fn();
		window.open = mockOpen;

		// Mock the exportMosaic function
		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue("data:image/png;base64,exported-image-data");

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		await waitFor(() => {
			expect(mockOpen).toHaveBeenCalledWith(
				"data:image/png;base64,exported-image-data",
				"_blank",
			);
		});

		// Clean up
		mockExportMosaic.mockRestore();
	});
});
