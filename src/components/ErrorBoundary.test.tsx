import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

vi.mock("../telemetry", () => ({
	trackError: vi.fn(),
}));

function BrokenComponent(): React.ReactElement {
	throw new Error("Test render crash");
}

describe("ErrorBoundary", () => {
	it("renders children when no error occurs", () => {
		render(
			<ErrorBoundary>
				<p data-testid="child">All good</p>
			</ErrorBoundary>,
		);

		expect(screen.getByTestId("child")).toBeInTheDocument();
		expect(screen.getByTestId("child")).toHaveTextContent("All good");
	});

	it("renders fallback UI when a child throws", () => {
		// Suppress React's expected error log during test
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		render(
			<ErrorBoundary>
				<BrokenComponent />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Refresh Page" }),
		).toBeInTheDocument();

		consoleError.mockRestore();
	});

	it("reports the error to telemetry", async () => {
		const { trackError } = await import("../telemetry");
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		render(
			<ErrorBoundary>
				<BrokenComponent />
			</ErrorBoundary>,
		);

		expect(trackError).toHaveBeenCalledWith(
			"react_rendering",
			expect.any(Error),
			expect.objectContaining({
				componentStack: expect.any(String),
			}),
		);

		const call = (trackError as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(call[1].message).toBe("Test render crash");

		consoleError.mockRestore();
	});
});
