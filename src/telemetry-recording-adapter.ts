import { BaseTelemetryAdapter } from "./telemetry-base-adapter";

/**
 * Recording telemetry adapter. Records events in memory for testing,
 * replacing module-path mocking.
 */
export class RecordingTelemetryAdapter extends BaseTelemetryAdapter {
	public events: Array<{ name: string; payload: Record<string, string> }> = [];

	constructor() {
		super("test-session-id", "test-version");
	}

	protected emitEvent(name: string, attributes: Record<string, string>): void {
		this.events.push({ name, payload: attributes });
	}

	async collectDeviceAnalytics(): Promise<void> {
		if (this.hasCollectedDeviceAnalytics) {
			return;
		}
		this.hasCollectedDeviceAnalytics = true;

		this.track("device_analytics", {
			os: "test-os",
			deviceType: "Desktop",
			memory: 8,
			screenResolution: "1920×1080",
			viewportResolution: "1200×800",
			deviceId: "test-device-id",
		});
	}

	/** Clear recorded events. */
	clear(): void {
		this.events = [];
	}

	/** Get recorded events matching an exact name. */
	getEventsByName(
		name: string,
	): Array<{ name: string; payload: Record<string, string> }> {
		return this.events.filter((event) => event.name === name);
	}

	/** Get recorded events whose name matches a pattern. */
	getEventsByNamePattern(
		pattern: RegExp,
	): Array<{ name: string; payload: Record<string, string> }> {
		return this.events.filter((event) => pattern.test(event.name));
	}
}
