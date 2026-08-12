import { VERSION_STRING } from "../version";

/** Application footer displaying the current version for identification and support purposes. */
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
