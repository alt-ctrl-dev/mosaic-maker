import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { hasTelemetryConsent, setTelemetryConsent } from "../telemetry";
import { VERSION_STRING } from "../version";

const styles = stylex.create({
	footer: {
		textAlign: "center",
		padding: "1rem",
		color: tokens.muted,
		fontSize: "0.85rem",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: tokens.border,
		marginTop: "auto",
	},
	stack: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "0.5rem",
	},
	consentRow: { display: "flex", alignItems: "center", gap: "0.5rem" },
	consentLabel: { margin: 0, fontSize: "0.85rem", fontWeight: 600 },
});

/** Application footer showing the build version. */
export function AppFooter() {
	// Checked only for an affirmative versioned record; fresh visits, legacy
	// values and refusals all render unchecked until the user chooses.
	const [consent, setConsent] = useState(() => hasTelemetryConsent());

	const handleConsentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setTelemetryConsent(event.target.checked);
		setConsent(event.target.checked);
	};

	return (
		<footer {...stylex.props(styles.footer)}>
			<div {...stylex.props(styles.stack)}>
				<div>Mosaic Maker {VERSION_STRING}</div>
				<div {...stylex.props(styles.consentRow)}>
					<input
						type="checkbox"
						id="telemetry-consent"
						checked={consent}
						onChange={handleConsentChange}
						{...stylex.props(base.accentPrimary, base.focusOutline)}
					/>
					<label
						htmlFor="telemetry-consent"
						{...stylex.props(styles.consentLabel)}
					>
						Share anonymous usage data
					</label>
				</div>
			</div>
		</footer>
	);
}
