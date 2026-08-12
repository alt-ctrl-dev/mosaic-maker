import { VERSION_STRING } from "../version";

/**
 * Footer component that displays the application version information.
 * This component is always visible at the bottom of the application UI
 * to help users identify exactly which version they are running.
 */
export function AppFooter() {
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
			Mosaic Maker {VERSION_STRING}
		</footer>
	);
}
