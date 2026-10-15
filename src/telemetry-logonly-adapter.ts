import {
	BaseTelemetryAdapter,
	resolveSessionId,
} from "./telemetry-base-adapter";
import { SEMVER } from "./version";

/**
 * Log-only telemetry adapter. Mirrors events to the console when Faro is
 * not configured, preserving dev/default behavior.
 */
export class LogOnlyTelemetryAdapter extends BaseTelemetryAdapter {
	constructor() {
		super(resolveSessionId(), SEMVER);
	}

	protected emitEvent(name: string, attributes: Record<string, string>): void {
		console.log(`[Telemetry] ${name}:`, JSON.stringify(attributes, null, 2));
	}
}
