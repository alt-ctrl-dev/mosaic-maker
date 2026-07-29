/**
 * Accessibility utilities for the Mosaic Maker application.
 * Provides helpers for keyboard navigation, focus management, and screen reader announcements.
 */

/**
 * Focus management utilities for keyboard navigation.
 */

/**
 * Move focus to the next focusable element within a container.
 * @param container The container element to search within
 * @param currentElement The currently focused element
 * @param reverse Whether to move focus in reverse order (shift+tab)
 * @returns The element that received focus, or null if none found
 */
export function moveFocus(
	container: HTMLElement,
	currentElement: Element | null,
	reverse = false,
): HTMLElement | null {
	const focusableElements = getFocusableElements(container);
	if (focusableElements.length === 0) return null;

	if (!currentElement) {
		// Focus the first or last element
		const element = reverse
			? focusableElements[focusableElements.length - 1]
			: focusableElements[0];
		if (element) {
			element.focus();
			return element;
		}
		return null;
	}

	const currentIndex = focusableElements.indexOf(currentElement as HTMLElement);
	if (currentIndex === -1) return null;

	const nextIndex = reverse
		? (currentIndex - 1 + focusableElements.length) % focusableElements.length
		: (currentIndex + 1) % focusableElements.length;

	const element = focusableElements[nextIndex];
	element.focus();
	return element;
}

/**
 * Get all focusable elements within a container.
 * @param container The container element to search within
 * @returns Array of focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	const selector =
		'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
	return Array.from(container.querySelectorAll(selector)).filter(
		(element) =>
			!(element as HTMLInputElement).disabled &&
			!(element as HTMLElement).hidden &&
			(element as HTMLElement).offsetWidth > 0,
	) as HTMLElement[];
}

/**
 * Trap focus within a container element.
 * @param container The container to trap focus within
 * @param event The keyboard event
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
	if (event.key === "Tab") {
		const focusableElements = getFocusableElements(container);
		if (focusableElements.length === 0) return;

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (event.shiftKey && document.activeElement === firstElement) {
			lastElement.focus();
			event.preventDefault();
		} else if (!event.shiftKey && document.activeElement === lastElement) {
			firstElement.focus();
			event.preventDefault();
		}
	}
}

/**
 * Screen reader announcement utilities.
 */

let liveRegion: HTMLElement | null = null;

/**
 * Create a screen reader live region if it doesn't exist.
 */
function ensureLiveRegion(): void {
	if (liveRegion) return;

	liveRegion = document.createElement("div");
	liveRegion.setAttribute("aria-live", "polite");
	liveRegion.setAttribute("aria-atomic", "true");
	liveRegion.style.position = "absolute";
	liveRegion.style.left = "-10000px";
	liveRegion.style.width = "1px";
	liveRegion.style.height = "1px";
	liveRegion.style.overflow = "hidden";
	document.body.appendChild(liveRegion);
}

/**
 * Announce a message to screen readers.
 * @param message The message to announce
 * @param priority The priority level ("polite" or "assertive")
 */
export function announce(
	message: string,
	priority: "polite" | "assertive" = "polite",
): void {
	ensureLiveRegion();
	if (!liveRegion) return;

	// Clear previous content
	liveRegion.textContent = "";

	// Set the appropriate aria-live attribute
	liveRegion.setAttribute("aria-live", priority);

	// Add the new message
	liveRegion.textContent = message;

	// Force screen readers to read the message by temporarily changing the content
	setTimeout(() => {
		if (liveRegion) {
			liveRegion.textContent = "";
			liveRegion.textContent = message;
		}
	}, 100);
}

/**
 * Reduced motion preference detection.
 */

/**
 * Check if the user prefers reduced motion.
 * @returns True if reduced motion is preferred, false otherwise
 */
export function prefersReducedMotion(): boolean {
	return (
		window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
	);
}

/**
 * Add a class to an element when reduced motion is preferred.
 * @param element The element to modify
 * @param className The class name to add
 */
export function applyReducedMotionClass(
	element: HTMLElement,
	className = "reduced-motion",
): void {
	if (prefersReducedMotion()) {
		element.classList.add(className);
	}
}

/**
 * Keyboard event utilities for common patterns.
 */

/**
 * Check if an event represents the Enter key.
 * @param event The keyboard event
 * @returns True if the event is for the Enter key
 */
export function isEnterKey(event: KeyboardEvent): boolean {
	return event.key === "Enter";
}

/**
 * Check if an event represents the Space key.
 * @param event The keyboard event
 * @returns True if the event is for the Space key
 */
export function isSpaceKey(event: KeyboardEvent): boolean {
	return event.key === " ";
}

/**
 * Check if an event represents the Escape key.
 * @param event The keyboard event
 * @returns True if the event is for the Escape key
 */
export function isEscapeKey(event: KeyboardEvent): boolean {
	return event.key === "Escape";
}

/**
 * Check if an event represents an activation key (Enter or Space).
 * @param event The keyboard event
 * @returns True if the event is for an activation key
 */
export function isActivationKey(event: KeyboardEvent): boolean {
	return isEnterKey(event) || isSpaceKey(event);
}
