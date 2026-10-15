import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithWorkflow } from "../test-utils/workflow";
import { SourceImageSelection } from "./SourceImageSelection";

// Mock canvas APIs for Vitest environment
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
	drawImage: vi.fn(),
	fillRect: vi.fn(),
	measureText: vi.fn().mockReturnValue({ width: 0 }),
}));

const mockFileReader = {
	readAsDataURL: vi.fn().mockImplementation(function (this: FileReader) {
		setTimeout(() => {
			// @ts-expect-error - mock property on native type
			this.onload?.({ target: { result: "data:image/png;base64,test" } });
		}, 0);
	}),
};

vi.stubGlobal(
	"FileReader",
	vi.fn(() => mockFileReader),
);

vi.stubGlobal("URL", {
	createObjectURL: vi.fn().mockReturnValue("blob:test"),
	revokeObjectURL: vi.fn(),
});

describe("SourceImageSelection state persistence", () => {
	it("shows preview when the store contains a source image", () => {
		renderWithWorkflow(<SourceImageSelection />, {
			sourceImage: {
				url: "blob:test",
				width: 100,
				height: 100,
				orientation: 1,
			},
		});

		expect(screen.getByAltText("Source")).toBeInTheDocument();
		expect(
			screen.getByText("Dimensions: 100 × 100 pixels"),
		).toBeInTheDocument();
	});

	it("shows error when the store contains a source image error", () => {
		renderWithWorkflow(<SourceImageSelection />, {
			sourceImageError: "Test error message",
		});

		expect(screen.getByText("Test error message")).toBeInTheDocument();
	});

	it("labels the continue button with the next workflow step", () => {
		renderWithWorkflow(<SourceImageSelection />, {
			sourceImage: {
				url: "blob:test",
				width: 100,
				height: 100,
				orientation: 1,
			},
			hasValidSourceDimensions: true,
		});

		expect(
			screen.getByRole("button", { name: /continue to step 2/i }),
		).toBeInTheDocument();
	});
});
