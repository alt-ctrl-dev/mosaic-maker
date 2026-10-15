import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { tokens } from "./styles/tokens.stylex";
import type { TelemetryService } from "./telemetry-port";
import { getTelemetry, setTelemetry } from "./telemetry-service";
import {
	FaroTelemetryAdapter,
	initializeFaroTelemetry,
} from "./telemetry-faro-adapter";
import { LogOnlyTelemetryAdapter } from "./telemetry-logonly-adapter";

// ponytail: StyleX cannot target elements outside the React tree, so the
// body-level resets the deleted global stylesheet provided live here.
// Upgrade if StyleX gains a global-styles story.
document.body.style.margin = "0";
document.body.style.backgroundColor = tokens.background;

// Initialize telemetry before app bootstrap
function initializeTelemetry(): void {
	// Consent defaults to granted when no preference has been stored,
	// matching pre-existing semantics.
	const storedConsent = localStorage.getItem("telemetry-consent");
	const hasConsent = storedConsent === null || storedConsent === "true";

	const isFaroConfigured =
		Boolean(import.meta.env.VITE_FARO_URL) &&
		Boolean(import.meta.env.VITE_FARO_APP_NAME);

	let telemetryService: TelemetryService;
	if (hasConsent && isFaroConfigured) {
		initializeFaroTelemetry(
			import.meta.env.VITE_FARO_URL,
			import.meta.env.VITE_FARO_APP_NAME,
		);
		telemetryService = new FaroTelemetryAdapter();
	} else {
		telemetryService = new LogOnlyTelemetryAdapter();
	}

	setTelemetry(telemetryService);
}

initializeTelemetry();

const root = document.getElementById("root");

if (!root) {
	throw new Error("Root element not found");
}

const reactRoot = createRoot(root);

reactRoot.render(
	<StrictMode>
		<App />
	</StrictMode>,
);

void getTelemetry()
	.collectDeviceAnalytics()
	.catch((error: unknown) => {
		console.error("Failed to track device analytics:", error);
	});
