import { describe, it, expect } from "vitest";
import { getTelemetry, setTelemetry } from "./telemetry-service";
import { RecordingTelemetryAdapter } from "./telemetry-recording-adapter";

describe("telemetry-service", () => {
	it("should return a service when one is registered", () => {
		const recordingAdapter = new RecordingTelemetryAdapter();
		setTelemetry(recordingAdapter);

		const telemetry = getTelemetry();
		expect(telemetry).toBe(recordingAdapter);
	});

	it("should track events through the recording adapter", () => {
		const recordingAdapter = new RecordingTelemetryAdapter();
		setTelemetry(recordingAdapter);

		const telemetry = getTelemetry();
		telemetry.stepViewed("choose_source_image");

		expect(recordingAdapter.events).toHaveLength(1);
		expect(recordingAdapter.events[0].name).toBe(
			"step_view_choose_source_image",
		);
	});
});
