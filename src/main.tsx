import "@picocss/pico/css/pico.min.css";
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
		<main className="container" aria-busy="true">
			<article aria-busy="true">Loading…</article>
		</main>
	</StrictMode>,
);

trackDeviceAnalytics().finally(() => {
	reactRoot.render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
});
