/**
 * Renders a studded brick-like tessera as a data URL.
 *
 * For browser environments, generates a PNG. For test environments (jsdom)
 * without canvas, falls back to an SVG data URL.
 *
 * @param color - The hex color value, e.g. "#FF0000"
 * @param size - The size of the tessera in pixels (default: 128)
 * @returns A data URL for an image of a studded brick
 */
export function renderBrick(color: string, size = 128): string {
	// If canvas is available (browser), generate PNG
	if (typeof document !== "undefined" && document.createElement) {
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			return renderBrickOnCanvas(ctx, color, size);
		}
	}

	// Fallback: generate SVG data URL for tests or any environment without canvas
	return renderBrickAsSvg(color, size);
}

/**
 * Renders a studded brick as a PNG data URL by drawing on a canvas.
 *
 * @param ctx - Canvas 2D context
 * @param color - The hex color value, e.g. "#FF0000"
 * @param size - The size of the tessera in pixels (default: 128)
 * @returns PNG data URL of the brick
 */
function renderBrickOnCanvas(
	ctx: CanvasRenderingContext2D,
	color: string,
	size = 128,
): string {
	// Draw base
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, size, size);

	// Bevel edges (top-left highlight, bottom-right shadow)
	const edge = Math.floor(size * 0.06);
	ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
	ctx.fillRect(0, 0, size, edge); // Top
	ctx.fillRect(0, 0, edge, size); // Left

	ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
	ctx.fillRect(0, size - edge, size, edge); // Bottom
	ctx.fillRect(size - edge, 0, edge, size); // Right

	// Draw stud (centered circle)
	const studRadius = size * 0.3;
	const studCenter = size / 2;

	// Outer ring (slightly darker ring)
	ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
	ctx.lineWidth = size * 0.02;
	ctx.beginPath();
	ctx.arc(studCenter, studCenter, studRadius, 0, Math.PI * 2);
	ctx.stroke();

	// Central fill (lighter)
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(studCenter, studCenter, studRadius * 0.7, 0, Math.PI * 2);
	ctx.fill();

	// Highlight on top-left of stud
	ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
	ctx.lineWidth = size * 0.02;
	ctx.beginPath();
	ctx.arc(
		studCenter - studRadius * 0.2,
		studCenter - studRadius * 0.2,
		studRadius * 0.4,
		0,
		Math.PI * 0.5,
	);
	ctx.stroke();

	// Shadow on bottom-right
	ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
	ctx.lineWidth = size * 0.02;
	ctx.beginPath();
	ctx.arc(
		studCenter + studRadius * 0.2,
		studCenter + studRadius * 0.2,
		studRadius * 0.4,
		0,
		Math.PI * 0.5,
	);
	ctx.stroke();

	return ctx.canvas.toDataURL("image/png");
}

/**
 * Renders a studded brick as an SVG data URL.
 *
 * @param color - The hex color value, e.g. "#FF0000"
 * @param size - The size of the tessera in pixels (default: 128)
 * @returns SVG data URL of the brick
 */
function renderBrickAsSvg(color: string, size = 128): string {
	// For now, simpler SVG with rectangular base and simple circular stud
	const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
	<rect x="0" y="0" width="100" height="100" fill="${color}" />
	<rect x="0" y="0" width="100" height="6" fill="rgba(255,255,255,0.15)" />
	<rect x="0" y="0" width="6" height="100" fill="rgba(255,255,255,0.15)" />
	<rect x="0" y="94" width="100" height="6" fill="rgba(0,0,0,0.2)" />
	<rect x="94" y="0" width="6" height="100" fill="rgba(0,0,0,0.2)" />
	<circle cx="50" cy="50" r="30" fill="${color}" />
	<circle cx="50" cy="50" r="21" fill="rgba(255,255,255,0.35)" />
	<circle cx="50" cy="50" r="26" fill="rgba(0,0,0,0.25)" />
</svg>`;

	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
