import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { tokens } from "./styles/tokens.stylex";
import { initializeTelemetry, trackDeviceAnalytics } from "./telemetry";

// StyleX styles are scoped to the React tree, so body-level resets that the
// removed global stylesheet used to provide live here.
document.body.style.margin = "0";
document.body.style.minWidth = "20rem";
document.body.style.backgroundColor = tokens.background;

// Initialize telemetry before app bootstrap
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

void trackDeviceAnalytics().catch((error: unknown) => {
	console.error("Failed to track device analytics:", error);
});
