import { useState } from "react";
import { OptionalButton } from "./OptionalButton";

type Scheme = "light" | "dark";

/**
 * localStorage key holding a pinned scheme. The pre-paint script in
 * index.html reads the same key so the shell never flashes the wrong field.
 */
const SCHEME_KEY = "color-scheme";

/** The scheme the page is showing: the pinned one, else the OS preference. */
function currentScheme(): Scheme {
	const pinned = localStorage.getItem(SCHEME_KEY);
	if (pinned === "light" || pinned === "dark") return pinned;
	// Absent outside a browser (jsdom), where the dark world is the default.
	return window.matchMedia?.("(prefers-color-scheme: light)").matches
		? "light"
		: "dark";
}

/**
 * Two-position light/dark switch. Until it is pressed the app follows the OS
 * scheme; pressing it pins the other one on <html> and saves the choice.
 */
export function ThemeToggle() {
	const [scheme, setScheme] = useState<Scheme>(currentScheme);

	function pin(other: Scheme) {
		document.documentElement.style.setProperty("color-scheme", other);
		localStorage.setItem(SCHEME_KEY, other);
		setScheme(other);
	}

	// shortcut: no prefers-color-scheme listener, so an OS change mid-session
	// leaves the label stale until the next render; add one if that bites.
	const other = scheme === "light" ? "dark" : "light";

	return (
		<OptionalButton type="button" onClick={() => pin(other)}>
			Switch to {other} mode
		</OptionalButton>
	);
}
