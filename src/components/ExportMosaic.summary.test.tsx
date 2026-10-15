import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as exportEngine from "../engine/export";
import { INITIAL_WORKFLOW_STATE, WorkflowStep } from "../engine/workflow-state";
import { ExportMosaic } from "./ExportMosaic";

const mockDispatch = vi.fn();

const mockMosaicResult = {
	dataUrl: "data:image/png;base64,mock-image-data",
	width: 1200,
	height: 800,
};

const mockState = {
	...INITIAL_WORKFLOW_STATE,
	currentStep: WorkflowStep.EXPORT_MOSAIC,
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
		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		expect(screen.getByText(/PNG · 1200×800 · ~0 KB/)).toBeInTheDocument();
	});

	it("should display confirmation after successful export", async () => {
		const mockExportMosaic = vi
			.spyOn(exportEngine, "exportMosaic")
			.mockResolvedValue("data:image/png;base64,exported-image-data");

		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		const downloadButton = screen.getByRole("button", { name: "Download" });
		fireEvent.click(downloadButton);

		await waitFor(() => {
			expect(screen.getByText(/Delivered!/)).toBeInTheDocument();
		});

		mockExportMosaic.mockRestore();
	});

	it("should open export settings by default for jpeg format", () => {
		const jpegState = {
			...mockState,
			exportFormat: "jpeg" as const,
		};

		render(<ExportMosaic state={jpegState} dispatch={mockDispatch} />);

		expect(screen.getByText("Quality Settings")).toBeInTheDocument();
	});

	it("should open export settings by default for webp format", () => {
		const webpState = {
			...mockState,
			exportFormat: "webp" as const,
		};

		render(<ExportMosaic state={webpState} dispatch={mockDispatch} />);

		expect(screen.getByText("Quality Settings")).toBeInTheDocument();
	});

	it("should keep export settings closed by default for png format", () => {
		render(<ExportMosaic state={mockState} dispatch={mockDispatch} />);

		expect(screen.queryByText("Quality Settings")).not.toBeInTheDocument();
	});
});
