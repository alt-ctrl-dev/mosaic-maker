/**
 * Trigger haptic feedback where the Vibration API is available (Android
 * Chrome). iOS Safari and desktop browsers have no vibration support, so
 * this is a silent no-op there.
 */
export function vibrate(pattern: number | number[]): void {
	try {
		navigator.vibrate?.(pattern);
	} catch {
		// Some browsers throw outside of a user gesture; feedback is best-effort.
	}
}
