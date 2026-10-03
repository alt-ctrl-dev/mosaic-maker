import { useEffect, useState } from "react";
import { hasTelemetryConsent, setTelemetryConsent } from "../telemetry";
import { VERSION_STRING } from "../version";

/** Application footer showing the build version. */
export function AppFooter() {
	const [consent, setConsent] = useState(hasTelemetryConsent());

	useEffect(() => {
		setTelemetryConsent(consent);
	}, [consent]);

	const handleConsentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setConsent(event.target.checked);
	};

	return (
		<footer
			style={{
				textAlign: "center",
				padding: "1rem",
				color: "var(--pico-muted-color)",
				fontSize: "0.85rem",
				borderTop: "1px solid var(--pico-muted-border-color)",
				marginTop: "auto",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "0.5rem",
				}}
			>
				<div>Mosaic Maker {VERSION_STRING}</div>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<input
						type="checkbox"
						id="telemetry-consent"
						checked={consent}
						onChange={handleConsentChange}
					/>
					<label
						htmlFor="telemetry-consent"
						style={{ margin: 0, fontSize: "0.85rem" }}
					>
						Share anonymous usage data
					</label>
				</div>
			</div>
		</footer>
	);
}
