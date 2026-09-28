/**
 * Analytics module for tracking user interactions and performance metrics.
 * Provides a centralized tracking mechanism for emitting events throughout the application.
 */

let sessionId: string | null = null;

/**
 * Generate a cryptographically secure session ID from random bytes.
 * Used as a fallback when crypto.randomUUID is unavailable.
 *
 * @returns Session ID string with 16 bytes of entropy encoded as hex
 */
function generateSecureSessionId(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	const hex = Array.from(bytes, (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
	return `session-${Date.now()}-${hex}`;
}

/**
 * Initialize analytics with a session ID.
 * Should be called once when the application starts.
 */
export function initAnalytics(): void {
	sessionId = crypto.randomUUID?.() || generateSecureSessionId();
}

/**
 * Get the current session ID.
 * @returns Session ID or null if not initialized
 */
export function getSessionId(): string | null {
	return sessionId;
}

/**
 * Track an analytics event.
 *
 * @param event - Event name
 * @param payload - Event payload data
 */
export function track(event: string, payload: Record<string, unknown>): void {
	console.log(`[Analytics] ${event}:`, JSON.stringify(payload, null, 2));
}
