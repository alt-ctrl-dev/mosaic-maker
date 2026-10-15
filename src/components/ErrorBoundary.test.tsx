import { render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecordingTelemetryAdapter } from "../telemetry-recording-adapter";
import { setTelemetry } from "../telemetry-service";
import { ErrorBoundary } from "./ErrorBoundary";

function BrokenComponent(): React.ReactElement {
	throw new Error("Test render crash");
}

describe("ErrorBoundary", () => {
	let recordingAdapter: RecordingTelemetryAdapter;

	beforeEach(() => {
		recordingAdapter = new RecordingTelemetryAdapter();
		setTelemetry(recordingAdapter);
	});

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

	it("reports the error to telemetry", () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		render(
			<ErrorBoundary>
				<BrokenComponent />
			</ErrorBoundary>,
		);

		const errorEvents = recordingAdapter.getEventsByNamePattern(
			/^error_react_rendering$/,
		);
		expect(errorEvents).toHaveLength(1);
		const payload = errorEvents[0].payload;
		expect(payload.step).toBe("react_rendering");
		expect(payload.errorName).toBe("Error");
		expect(payload.errorMessage).toBe("Test render crash");
		expect(payload.context).toBeDefined();
		expect(payload.context).toContain("componentStack");

		consoleError.mockRestore();
	});
});
