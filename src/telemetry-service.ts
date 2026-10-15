import type { TelemetryService } from "./telemetry-port";
import { LogOnlyTelemetryAdapter } from "./telemetry-logonly-adapter";

// Default to a safe no-op service
let telemetryService: TelemetryService | null = null;
let hasWarned = false;

/**
 * Get the telemetry service instance.
 * Returns a no-op service if none has been registered.
 */
export function getTelemetry(): TelemetryService {
	if (telemetryService) {
		return telemetryService;
	}

	// Warn once if telemetry service is not registered
	if (!hasWarned) {
		console.warn(
			"Telemetry service not registered, using no-op implementation",
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
