import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TesseraUpload } from "./TesseraUpload";

// Mock the processTesserae function
vi.mock("../engine/tessera-processing", () => ({
	processTesserae: vi.fn().mockResolvedValue([]),
}));

// Mock haptics
vi.mock("../haptics", () => ({
	vibrate: vi.fn(),
}));

// Mock the resource policy functions
vi.mock("../engine/resource-policy", async () => {
	const actual = await vi.importActual("../engine/resource-policy");
	return {
		...actual,
		isFileSizeExceeded: vi
			.fn()
			.mockImplementation((file: File) => file.size > 25 * 1024 * 1024),
		isTotalRetainedSizeExceeded: vi.fn().mockReturnValue(false),
		isTesseraFileLimitExceeded: vi.fn().mockReturnValue(false),
		isDimensionLimitExceeded: vi.fn().mockReturnValue(false),
		getImageDimensions: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
		getFileSizeErrorMessage: vi
			.fn()
			.mockImplementation(
				(fileName: string) => `File "${fileName}" is too large`,
			),
		getTotalSizeErrorMessage: vi.fn().mockReturnValue("Total size exceeded"),
		getFileCountErrorMessage: vi.fn().mockReturnValue("Too many files"),
		getDimensionErrorMessage: vi.fn().mockReturnValue("Dimensions exceeded"),
	};
});

describe("TesseraUpload", () => {
	const mockOnTesseraeProcessed = vi.fn();
	const defaultProps = {
		onTesseraeProcessed: mockOnTesseraeProcessed,
		adjustedTesseraSize: 50,
		currentTesserae: [],
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("renders without crashing", () => {
		render(<TesseraUpload {...defaultProps} />);
		expect(screen.getByText("Upload your own images")).toBeInTheDocument();
	});

	it("shows file size error message when individual file is too large", async () => {
		const { isFileSizeExceeded, getFileSizeErrorMessage } = await import(
			"../engine/resource-policy"
		);
		vi.mocked(isFileSizeExceeded).mockImplementation(
			(file: File) => file.size > 25 * 1024 * 1024,
		);
		vi.mocked(getFileSizeErrorMessage).mockImplementation(
			(fileName: string) => `File "${fileName}" is too large`,
		);

		render(<TesseraUpload {...defaultProps} />);

		const largeFile = new File(
			[new ArrayBuffer(30 * 1024 * 1024)],
			"large.jpg",
			{ type: "image/jpeg" },
		);

		const input = screen.getByLabelText("Upload tesserae images");
		fireEvent.change(input, { target: { files: [largeFile] } });

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(screen.getByRole("alert")).toHaveTextContent(
			'File "large.jpg" is too large',
		);
	});

	it("shows file count error message when too many files", async () => {
		const { isTesseraFileLimitExceeded, getFileCountErrorMessage } =
			await import("../engine/resource-policy");
		vi.mocked(isTesseraFileLimitExceeded).mockReturnValue(true);
		vi.mocked(getFileCountErrorMessage).mockReturnValue("Too many files");

		render(<TesseraUpload {...defaultProps} />);

		const files = Array.from(
			{ length: 501 },
			(_, i) =>
				new File([new ArrayBuffer(1024)], `file${i}.jpg`, {
					type: "image/jpeg",
				}),
		);

		const input = screen.getByLabelText("Upload tesserae images");
		fireEvent.change(input, { target: { files } });

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(screen.getByRole("alert")).toHaveTextContent("Too many files");
	});

	it("shows total size error message when total size exceeded", async () => {
		const {
			isTesseraFileLimitExceeded,
			isFileSizeExceeded,
			isTotalRetainedSizeExceeded,
			getTotalSizeErrorMessage,
		} = await import("../engine/resource-policy");
		vi.mocked(isTesseraFileLimitExceeded).mockReturnValue(false);
		vi.mocked(isFileSizeExceeded).mockReturnValue(false);
		vi.mocked(isTotalRetainedSizeExceeded).mockReturnValue(true);
		vi.mocked(getTotalSizeErrorMessage).mockReturnValue("Total size exceeded");

		render(<TesseraUpload {...defaultProps} />);

		const largeFiles = [
			new File([new ArrayBuffer(150 * 1024 * 1024)], "large1.jpg", {
				type: "image/jpeg",
			}),
			new File([new ArrayBuffer(150 * 1024 * 1024)], "large2.jpg", {
				type: "image/jpeg",
			}),
		];

		const input = screen.getByLabelText("Upload tesserae images");
		fireEvent.change(input, { target: { files: largeFiles } });

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(screen.getByRole("alert")).toHaveTextContent("Total size exceeded");
	});
});
