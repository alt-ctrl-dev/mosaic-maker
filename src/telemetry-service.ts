import type { TelemetryService } from "./telemetry-port";
import { LogOnlyTelemetryAdapter } from "./telemetry-logonly-adapter";

// Default to null — lazily creates a log-only adapter on first access
let telemetryService: TelemetryService | null = null;
let hasWarned = false;

/**
 * Get the telemetry service instance.
 * Returns a log-only adapter if none has been registered.
 * Never throws.
 */
export function getTelemetry(): TelemetryService {
	if (telemetryService) {
		return telemetryService;
	}

	if (!hasWarned) {
		console.warn(
			"Telemetry service not registered, falling back to log-only adapter",
		);
		hasWarned = true;
	}

	// Return a log-only adapter as fallback
	return new LogOnlyTelemetryAdapter();
}

/**
 * Set the telemetry service instance.
 */
export function setTelemetry(service: TelemetryService): void {
	telemetryService = service;
}
