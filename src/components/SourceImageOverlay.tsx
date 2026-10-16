import * as stylex from "@stylexjs/stylex";
import { useMemo } from "react";
import { tokens } from "../styles/tokens.stylex";
import { ActionButton } from "./ActionButton";

// StyleX only resolves computed conditional keys defined in the same module.
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

const styles = stylex.create({
	// Frosted-glass pane between the image and the overlay button.
	sourceGlass: {
		position: "absolute",
		inset: 0,
		backgroundColor: "rgba(26, 30, 42, 0.35)",
		backdropFilter: "blur(8px) saturate(1.2)",
		borderRadius: tokens.radius,
		pointerEvents: "none",
	},
	generateOverlay: {
		position: "absolute",
		top: "50%",
		left: "50%",
		transform: "translate(-50%, -50%)",
	},
	// Neumorphic raise on the dark field: soft dark drop shadow plus a faint
	// top-left highlight; pressing flips it to an inset (pushed-in) look.
	neuGenerateButton: {
		appearance: "none",
		borderWidth: 0,
		borderStyle: "none",
		borderRadius: "12px",
		padding: "0.85rem 1.75rem",
		font: "inherit",
		fontWeight: 700,
		letterSpacing: "0.02em",
		color: tokens.onPrimary,
		backgroundColor: { default: tokens.primary, ":hover": tokens.primaryHover },
		boxShadow: {
			default:
				"6px 6px 14px rgba(0, 0, 0, 0.55), -4px -4px 10px rgba(255, 255, 255, 0.08)",
			":active":
				"inset 4px 4px 9px rgba(0, 0, 0, 0.5), inset -3px -3px 7px rgba(255, 255, 255, 0.1)",
		},
		cursor: "pointer",
		":focus-visible": {
			outline: "2px solid currentColor",
			outlineOffset: "3px",
		},
		":disabled": { cursor: "not-allowed", opacity: 0.5 },
	},
	// Tile-fill animation over the source image while generating: cells
	// light up row by row as progress advances.
	tileOverlay: {
		position: "absolute",
		inset: 0,
		display: "grid",
		gap: "1px",
		backgroundColor: "rgba(18, 20, 28, 0.35)",
		borderRadius: tokens.radius,
		overflow: "hidden",
	},
	tileCell: {
		backgroundColor: "transparent",
		transition: "background-color 0.15s ease-out",
		[REDUCED_MOTION]: { transitionDuration: "0.01ms" },
	},
	tileCellFilled: { backgroundColor: "rgba(62, 198, 168, 0.5)" },
});

interface SourceImageOverlayProps {
	/** Whether mosaic generation is currently in flight. */
	isGenerating: boolean;
	/** Overlay grid mirroring the mosaic grid; null until computable. */
	grid: { cols: number; rows: number } | null;
	/** Number of overlay cells already filled by generation progress. */
	filledCells: number;
	/** Whether generation can start (all inputs present). */
	canGenerate: boolean;
	onGenerate: () => void;
	onCancel: () => void;
}

/**
 * Overlay on top of the centered source image on the generate step: while
 * idle it shows the frosted-glass pane with the generate button, while
 * generating it shows the tile-fill animation with a centered cancel
 * button.
 */
export function SourceImageOverlay({
	isGenerating,
	grid,
	filledCells,
	canGenerate,
	onGenerate,
	onCancel,
}: SourceImageOverlayProps) {
	const cellCount = grid ? grid.cols * grid.rows : 0;
	// Stable string keys; the lint rule rejects array-index keys.
	const cellIds = useMemo(
		() => Array.from({ length: cellCount }, (_, i) => `overlay-cell-${i}`),
		[cellCount],
	);

	if (!isGenerating) {
		return (
			<>
				<div aria-hidden="true" {...stylex.props(styles.sourceGlass)} />
				<div {...stylex.props(styles.generateOverlay)}>
					<button
						type="button"
						onClick={onGenerate}
						disabled={!canGenerate}
						{...stylex.props(styles.neuGenerateButton)}
					>
						Generate Mosaic
					</button>
				</div>
			</>
		);
	}

	return (
		<>
			<div
				{...stylex.props(styles.tileOverlay)}
				style={
					grid
						? {
								gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
								gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
							}
						: undefined
				}
				aria-hidden="true"
			>
				{cellIds.map((cellId, index) => (
					<div
						key={cellId}
						{...stylex.props(
							styles.tileCell,
							index < filledCells && styles.tileCellFilled,
						)}
					/>
				))}
			</div>
			<div {...stylex.props(styles.generateOverlay)}>
				<ActionButton type="button" onClick={onCancel}>
					Cancel
				</ActionButton>
			</div>
		</>
	);
}
