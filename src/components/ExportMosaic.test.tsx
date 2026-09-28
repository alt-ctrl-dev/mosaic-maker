import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportMosaic } from "./ExportMosaic";
import * as exportEngine from "../engine/export";
import { INITIAL_WORKFLOW_STATE, WorkflowStep } from "../engine/workflow-state";

const mockDispatch = vi.fn();

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

	it("should open image in new tab for iOS devices", async () => {
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
		});

		const mockOpen = vi.fn();
		window.open = mockOpen;

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

		mockExportMosaic.mockRestore();
	});

	it("should open image in new tab for iPadOS 13+ devices", async () => {
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
		});
		Object.defineProperty(navigator, "maxTouchPoints", {
			writable: true,
			value: 5,
		});

		const mockOpen = vi.fn();
		window.open = mockOpen;

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

		mockExportMosaic.mockRestore();
	});

	it("should show error when popup is blocked on iOS", async () => {
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
		});

		window.open = vi.fn().mockReturnValue(null);

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue("data:image/png;base64,exported-image-data");

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		await waitFor(() => {
			expect(screen.getByText(/Popup blocked/)).toBeInTheDocument();
		});

		mockExportMosaic.mockRestore();
	});

	it("should open image with blob URL on iOS to avoid blank tab issue", async () => {
		// Simulate iOS device
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
		});

		// Mock URL.createObjectURL and URL.revokeObjectURL
		const mockObjectUrl = "blob:test-url";
		const createObjectURLMock = vi
			.spyOn(URL, "createObjectURL")
			.mockImplementation((_) => mockObjectUrl);
		const revokeObjectURLMock = vi.spyOn(URL, "revokeObjectURL");

		const mockOpen = vi.fn().mockReturnValue({ document: { write: vi.fn() } });
		window.open = mockOpen;

		// Use valid base64 data for testing
		const imageData =
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(imageData);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		await waitFor(() => {
			// Should create a blob from the data URL
			expect(createObjectURLMock).toHaveBeenCalled();
			// Should open the blob URL in a new tab
			expect(mockOpen).toHaveBeenCalledWith(mockObjectUrl, "_blank");
		});

		mockExportMosaic.mockRestore();
		createObjectURLMock.mockRestore();
		revokeObjectURLMock.mockRestore();
	});
});
