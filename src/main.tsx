import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import { initializeTelemetry, trackDeviceAnalytics } from "./telemetry";

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
