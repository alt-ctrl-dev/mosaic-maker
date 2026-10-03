import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportMosaic } from "./ExportMosaic";
import * as exportEngine from "../engine/export";
import { INITIAL_WORKFLOW_STATE, WorkflowStep } from "../engine/workflow-state";

const mockDispatch = vi.fn();

const validBase64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
const validDataUrl = `data:image/png;base64,${validBase64}`;

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
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
		});
		Object.defineProperty(navigator, "maxTouchPoints", {
			writable: true,
			value: 0,
		});
		window.open = vi.fn().mockReturnValue(null);
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

		mockExportMosaic.mockRestore();
	});

	it("should show error message when export fails", async () => {
		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockRejectedValue(new Error("Export failed"));

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		await waitFor(() => {
			expect(screen.getByText("Export failed")).toBeInTheDocument();
		});

		mockExportMosaic.mockRestore();
	});

	it("should open image in new tab immediately on iOS devices to preserve user gesture", async () => {
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
		});

		// Mock window.open to return a valid window object
		const mockWindow = {
			document: {
				write: vi.fn(),
				close: vi.fn(),
			},
			focus: vi.fn(),
			close: vi.fn(),
		};
		const mockOpen = vi.fn().mockReturnValue(mockWindow);
		window.open = mockOpen;

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(validDataUrl);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		// Verify that window.open is called immediately (within the same tick)
		expect(mockOpen).toHaveBeenCalledWith("", "_blank");

		// Wait for the export to complete and the window to be populated
		await waitFor(() => {
			expect(mockExportMosaic).toHaveBeenCalledWith(
				mockMosaicResult.dataUrl,
				mockMosaicResult.width,
				mockMosaicResult.height,
				"png",
				0.9,
			);
			expect(mockWindow.document.write).toHaveBeenCalled();
		});

		mockExportMosaic.mockRestore();
	});

	it("should open image in new tab immediately on iPadOS 13+ devices to preserve user gesture", async () => {
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
		});
		Object.defineProperty(navigator, "maxTouchPoints", {
			writable: true,
			value: 5,
		});

		// Mock window.open to return a valid window object
		const mockWindow = {
			document: {
				write: vi.fn(),
				close: vi.fn(),
			},
			focus: vi.fn(),
			close: vi.fn(),
		};
		const mockOpen = vi.fn().mockReturnValue(mockWindow);
		window.open = mockOpen;

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(validDataUrl);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		// Verify that window.open is called immediately (within the same tick)
		expect(mockOpen).toHaveBeenCalledWith("", "_blank");

		// Wait for the export to complete and the window to be populated
		await waitFor(() => {
			expect(mockExportMosaic).toHaveBeenCalledWith(
				mockMosaicResult.dataUrl,
				mockMosaicResult.width,
				mockMosaicResult.height,
				"png",
				0.9,
			);
			expect(mockWindow.document.write).toHaveBeenCalled();
		});

		mockExportMosaic.mockRestore();
	});

	it("should show error when popup is blocked on iOS", async () => {
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
		});

		// Mock window.open to return null (blocked)
		window.open = vi.fn().mockReturnValue(null);

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(validDataUrl);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		await waitFor(() => {
			expect(screen.getByText(/Popup blocked/)).toBeInTheDocument();
		});

		mockExportMosaic.mockRestore();
	});

	it("should show error when blob conversion fails on iOS", async () => {
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
		});

		// Mock window.open to return a valid window object
		const mockWindow = {
			document: {
				write: vi.fn(),
				close: vi.fn(),
			},
			close: vi.fn(),
			focus: vi.fn(),
		};
		const mockOpen = vi.fn().mockReturnValue(mockWindow);
		window.open = mockOpen;

		// Use invalid base64 to trigger conversion failure
		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue("data:image/png;base64,!!!not-valid-base64!!!");

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		await waitFor(() => {
			expect(
				screen.getByText(/Could not prepare image for iOS/),
			).toBeInTheDocument();
		});

		mockExportMosaic.mockRestore();
	});

	it("should open image in new tab and populate it on iOS to avoid blank tab issue", async () => {
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
		});

		// Mock window.open to return a valid window object
		const mockWindow = {
			document: {
				write: vi.fn(),
				close: vi.fn(),
			},
			focus: vi.fn(),
			close: vi.fn(),
		};
		const mockOpen = vi.fn().mockReturnValue(mockWindow);
		window.open = mockOpen;

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(validDataUrl);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		// Verify that window.open is called immediately with blank page
		expect(mockOpen).toHaveBeenCalledWith("", "_blank");

		// Wait for the export to complete and the window to be populated
		await waitFor(() => {
			expect(mockExportMosaic).toHaveBeenCalledWith(
				mockMosaicResult.dataUrl,
				mockMosaicResult.width,
				mockMosaicResult.height,
				"png",
				0.9,
			);
			expect(mockWindow.document.write).toHaveBeenCalled();
		});

		mockExportMosaic.mockRestore();
	});
});
