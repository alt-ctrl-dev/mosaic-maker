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

// Mock navigator.share and navigator.canShare
const mockNavigatorShare = vi.fn();
const mockNavigatorCanShare = vi.fn();

/**
 * Create a mock popup window whose `document` is a real detached HTML document,
 * so the component can populate it with DOM APIs as it does in the browser.
 */
function createMockPopupWindow() {
	const popupDocument = document.implementation.createHTMLDocument("");
	return {
		document: popupDocument,
		focus: vi.fn(),
		close: vi.fn(),
		opener: {} as unknown,
	};
}

describe("ExportMosaic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset navigator.share and navigator.canShare mocks
		Object.defineProperty(navigator, "share", {
			writable: true,
			value: mockNavigatorShare,
		});
		Object.defineProperty(navigator, "canShare", {
			writable: true,
			value: mockNavigatorCanShare,
		});
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

		const mockWindow = createMockPopupWindow();
		const mockOpen = vi.fn().mockReturnValue(mockWindow);
		window.open = mockOpen;

		const mockBlobUrl = "blob:ios-test";
		vi.spyOn(URL, "createObjectURL").mockReturnValue(mockBlobUrl);

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(validDataUrl);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		expect(mockOpen).toHaveBeenCalledWith("", "_blank");

		await waitFor(() => {
			expect(mockExportMosaic).toHaveBeenCalledWith(
				mockMosaicResult.dataUrl,
				mockMosaicResult.width,
				mockMosaicResult.height,
				"png",
				0.9,
			);
			const img = mockWindow.document.querySelector("img");
			expect(img).not.toBeNull();
			expect(img?.getAttribute("src")).toBe(mockBlobUrl);
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

		const mockWindow = createMockPopupWindow();
		const mockOpen = vi.fn().mockReturnValue(mockWindow);
		window.open = mockOpen;

		const mockBlobUrl = "blob:ipados-test";
		vi.spyOn(URL, "createObjectURL").mockReturnValue(mockBlobUrl);

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(validDataUrl);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		expect(mockOpen).toHaveBeenCalledWith("", "_blank");

		await waitFor(() => {
			expect(mockExportMosaic).toHaveBeenCalledWith(
				mockMosaicResult.dataUrl,
				mockMosaicResult.width,
				mockMosaicResult.height,
				"png",
				0.9,
			);
			const img = mockWindow.document.querySelector("img");
			expect(img).not.toBeNull();
			expect(img?.getAttribute("src")).toBe(mockBlobUrl);
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

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		fireEvent.click(screen.getByRole("button", { name: "Download" }));

		await waitFor(() => {
			expect(screen.getByText(/Popup blocked/)).toBeInTheDocument();
		});
	});

	it("should show error when blob conversion fails on iOS", async () => {
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
		});

		const mockWindow = createMockPopupWindow();
		const mockOpen = vi.fn().mockReturnValue(mockWindow);
		window.open = mockOpen;

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue("data:image/png;base64,!!!not-valid-base64!!!");

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		fireEvent.click(screen.getByRole("button", { name: "Download" }));

		expect(mockOpen).toHaveBeenCalledWith("", "_blank");

		await waitFor(() => {
			expect(
				screen.getByText(/Could not prepare image for iOS/),
			).toBeInTheDocument();
		});

		mockExportMosaic.mockRestore();
	});

	it("should sever the opener reference on the new tab to prevent reverse tabnabbing", async () => {
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
		});

		const mockWindow = createMockPopupWindow();
		const mockOpen = vi.fn().mockReturnValue(mockWindow);
		window.open = mockOpen;

		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:opener-test");

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(validDataUrl);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		fireEvent.click(screen.getByRole("button", { name: "Download" }));

		expect(mockOpen).toHaveBeenCalledWith("", "_blank");

		await waitFor(() => {
			expect(mockWindow.opener).toBeNull();
		});

		mockExportMosaic.mockRestore();
	});

	it("should revoke the blob URL once the image has rendered to avoid leaking it", async () => {
		Object.defineProperty(navigator, "userAgent", {
			writable: true,
			value:
				"Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
		});

		const mockWindow = createMockPopupWindow();
		window.open = vi.fn().mockReturnValue(mockWindow);

		const mockBlobUrl = "blob:revoke-test";
		vi.spyOn(URL, "createObjectURL").mockReturnValue(mockBlobUrl);
		const revokeSpy = vi
			.spyOn(URL, "revokeObjectURL")
			.mockImplementation(() => {});

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(validDataUrl);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		fireEvent.click(screen.getByRole("button", { name: "Download" }));

		await waitFor(() => {
			expect(mockWindow.document.querySelector("img")).not.toBeNull();
		});

		expect(revokeSpy).not.toHaveBeenCalled();

		const img = mockWindow.document.querySelector("img");
		img?.dispatchEvent(new Event("load"));

		expect(revokeSpy).toHaveBeenCalledWith(mockBlobUrl);

		mockExportMosaic.mockRestore();
	});

	it("should show Share button when Web Share API is available and working", async () => {
		mockNavigatorCanShare.mockReturnValue(true);
		mockNavigatorShare.mockResolvedValue(undefined);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		// Should show both Download and Share buttons
		expect(
			screen.getByRole("button", { name: "Download" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
	});

	it("should use Web Share API when Share button is clicked", async () => {
		mockNavigatorCanShare.mockReturnValue(true);
		mockNavigatorShare.mockResolvedValue(undefined);

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(validDataUrl);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const shareButton = screen.getByRole("button", { name: "Share" });
		fireEvent.click(shareButton);

		await waitFor(() => {
			expect(mockNavigatorShare).toHaveBeenCalled();
		});

		mockExportMosaic.mockRestore();
	});

	it("should fall back to download when Web Share API is not available", async () => {
		Object.defineProperty(navigator, "share", {
			writable: true,
			value: undefined,
		});
		Object.defineProperty(navigator, "canShare", {
			writable: true,
			value: undefined,
		});

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(validDataUrl);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		// Should only show Download button
		expect(
			screen.getByRole("button", { name: "Download" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Share" }),
		).not.toBeInTheDocument();

		mockExportMosaic.mockRestore();
	});

	it("should fall back to download when Web Share API fails", async () => {
		mockNavigatorCanShare.mockReturnValue(true);
		mockNavigatorShare.mockRejectedValue(new Error("Share failed"));

		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue(validDataUrl);

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const shareButton = screen.getByRole("button", { name: "Share" });
		fireEvent.click(shareButton);

		// Should show error message
		await waitFor(() => {
			expect(screen.getByText(/Share failed/)).toBeInTheDocument();
		});

		mockExportMosaic.mockRestore();
	});
});
