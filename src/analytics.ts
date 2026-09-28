/**
 * Analytics module for tracking user interactions and performance metrics.
 * Provides a centralized tracking mechanism for emitting events throughout the application.
 */

let sessionId: string | null = null;

/**
 * Initialize analytics with a session ID.
 * Should be called once when the application starts.
 */
export function initAnalytics(): void {
	sessionId =
		crypto.randomUUID?.() ||
		`session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
