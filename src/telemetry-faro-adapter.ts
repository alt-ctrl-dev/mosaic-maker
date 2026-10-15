import {
	faro,
	getWebInstrumentations,
	initializeFaro,
	LogLevel,
} from "@grafana/faro-web-sdk";
import {
	BaseTelemetryAdapter,
	resolveSessionId,
} from "./telemetry-base-adapter";
import { SEMVER } from "./version";

/**
 * Faro telemetry adapter. Sends events to a Grafana Faro collector.
 */
export class FaroTelemetryAdapter extends BaseTelemetryAdapter {
	constructor() {
		super(resolveSessionId(), SEMVER);
	}

	protected emitEvent(name: string, attributes: Record<string, string>): void {
		faro.api.pushEvent(name, attributes);
	}
}

/**
 * Initialize Faro telemetry with the provided configuration.
 * @param faroUrl - The Faro collector URL
 * @param appName - The application name
 */
export function initializeFaroTelemetry(
	faroUrl: string,
	appName: string,
): void {
	const environment = import.meta.env.PROD ? "production" : "dev";
	const samplingRate = import.meta.env.SAMPLING_RATE ?? 1;

	try {
		initializeFaro({
			url: faroUrl,
			app: {
				name: appName,
				version: SEMVER,
				environment,
			},
			sessionTracking: {
				samplingRate,
			},
			webVitalsInstrumentation: {
				reportAllChanges: true,
			},
			instrumentations: [
				...getWebInstrumentations({
					captureConsole: true,
				}),
			],
			consoleInstrumentation: {
				disabledLevels: [
					LogLevel.DEBUG,
					LogLevel.TRACE,
					LogLevel.LOG,
					LogLevel.INFO,
					LogLevel.WARN,
				],
			},
		});

		console.log("Faro telemetry initialized successfully");
	} catch (error) {
		console.error("Failed to initialize Faro telemetry:", error);
	}
}
