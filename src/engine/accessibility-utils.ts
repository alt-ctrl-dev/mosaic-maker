/**
 * Accessibility helpers for keyboard navigation, focus management,
 * screen reader announcements, and reduced-motion detection.
 */

/**
 * Move focus to the next or previous focusable element within a container,
 * wrapping around at the edges. When no element is currently focused,
 * focuses the first (or last, when reversing) element in the container.
 * Returns the newly focused element, or null when the container has no
 * focusable children or the current element is not found within it.
 */
export function moveFocus(
	container: HTMLElement,
	currentElement: Element | null,
	reverse = false,
): HTMLElement | null {
	const focusable = getFocusableElements(container);
	if (focusable.length === 0) return null;

	if (!currentElement) {
		const target = reverse ? focusable[focusable.length - 1] : focusable[0];
		target.focus();
		return target;
	}

	const currentIndex = focusable.indexOf(currentElement as HTMLElement);
	if (currentIndex === -1) return null;

	const nextIndex = reverse
		? (currentIndex - 1 + focusable.length) % focusable.length
		: (currentIndex + 1) % focusable.length;

	focusable[nextIndex].focus();
	return focusable[nextIndex];
}

/** Narrow a generic Element to an interactive HTMLElement that is focusable. */
function isFocusableElement(element: Element): element is HTMLElement {
	if (!(element instanceof HTMLElement)) return false;
	if (element.hidden || element.offsetWidth <= 0) return false;
	if ("disabled" in element && (element as HTMLInputElement).disabled)
		return false;
	return true;
}

/**
 * Return every focusable element within a container (links, buttons, inputs,
 * textareas, selects, open details, and elements with a non-negative tabindex).
 * Excludes hidden, zero-width, and disabled elements.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	const selector =
		'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
	return Array.from(container.querySelectorAll(selector)).filter(
		isFocusableElement,
	);
}

/**
 * Trap Tab-key focus within a container. When Tab (or Shift+Tab) would move
 * focus outside the container, wraps focus to the opposite end instead.
 * Call this from a parent element's keydown handler.
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
	if (event.key !== "Tab") return;

	const focusable = getFocusableElements(container);
	if (focusable.length === 0) return;

	const first = focusable[0];
	const last = focusable[focusable.length - 1];

	if (event.shiftKey && document.activeElement === first) {
		last.focus();
		event.preventDefault();
	} else if (!event.shiftKey && document.activeElement === last) {
		first.focus();
		event.preventDefault();
	}
}

let liveRegion: HTMLElement | null = null;
let announceTimer: ReturnType<typeof setTimeout> | null = null;

function ensureLiveRegion(): void {
	if (liveRegion) return;

	liveRegion = document.createElement("div");
	liveRegion.setAttribute("aria-live", "polite");
	liveRegion.setAttribute("aria-atomic", "true");
	liveRegion.style.cssText =
		"position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden";
	document.body.appendChild(liveRegion);
}

/**
 * Announce a message to screen readers via a visually hidden live region.
 * Uses a "polite" priority by default; pass "assertive" for urgent updates.
 * Cancels any pending announcement before queuing a new one.
 */
export function announce(
	message: string,
	priority: "polite" | "assertive" = "polite",
): void {
	ensureLiveRegion();
	if (!liveRegion) return;

	if (announceTimer !== null) {
		clearTimeout(announceTimer);
		announceTimer = null;
	}

	liveRegion.setAttribute("aria-live", priority);
	liveRegion.textContent = message;

	announceTimer = setTimeout(() => {
		announceTimer = null;
		if (liveRegion) {
			liveRegion.textContent = "";
			liveRegion.textContent = message;
		}
	}, 100);
}

/**
 * Whether the user's system preference is set to reduce motion.
 * Safe to call in SSR environments where matchMedia may be absent.
 */
export function prefersReducedMotion(): boolean {
	return (
		window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
	);
}

/**
 * Conditionally add `className` to `element` when the user prefers reduced motion.
 */
export function applyReducedMotionClass(
	element: HTMLElement,
	className = "reduced-motion",
): void {
	if (prefersReducedMotion()) {
		element.classList.add(className);
	}
}

/** True when the keyboard event's key is "Enter". */
export function isEnterKey(event: KeyboardEvent): boolean {
	return event.key === "Enter";
}

/** True when the keyboard event's key is " " (Space). */
export function isSpaceKey(event: KeyboardEvent): boolean {
	return event.key === " ";
}

/** True when the keyboard event's key is "Escape". */
export function isEscapeKey(event: KeyboardEvent): boolean {
	return event.key === "Escape";
}

/** True when the keyboard event's key is an activation key (Enter or Space). */
export function isActivationKey(event: KeyboardEvent): boolean {
	return isEnterKey(event) || isSpaceKey(event);
}
