import * as stylex from "@stylexjs/stylex";
import { useAtom } from "jotai";
import { telemetryConsentAtom } from "../atoms/ui-atoms";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { VERSION_STRING } from "../version";
import { ThemeToggle } from "./ThemeToggle";

const styles = stylex.create({
	footer: {
		textAlign: "center",
		padding: "1rem",
		color: tokens.muted,
		fontSize: "0.85rem",
		borderTopWidth: "0.0625rem",
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
	// atomWithStorage persists the preference to localStorage on write.
	const [consent, setConsent] = useAtom(telemetryConsentAtom);

	const handleConsentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
				<ThemeToggle />
			</div>
		</footer>
	);
}
