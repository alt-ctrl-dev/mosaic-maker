/**
 * Visual prototype for evaluating direct-neighbor avoidance strategies.
 * Compares four tolerances: none, 10%, 5%, and adaptive.
 */

import { useState, useEffect } from "react";

interface Tessera {
	id: number;
	color: string;
	name: string;
}

interface MosaicCell {
	color: string;
	tesseraId: number;
	avoidAbove: boolean;
	avoidLeft: boolean;
}

const MOCK_SOURCE_IMAGES = [
	{ id: 1, name: "Gradient Sky", type: "gradient" },
	{ id: 2, name: "Solid Red Region", type: "solid" },
	{ id: 3, name: "Detailed Pattern", type: "pattern" },
];

const MOCK_TESSERAE: Tessera[] = [
	{ id: 1, color: "#FF0000", name: "Red" },
	{ id: 2, color: "#00FF00", name: "Green" },
	{ id: 3, color: "#0000FF", name: "Blue" },
	{ id: 4, color: "#FFFF00", name: "Yellow" },
	{ id: 5, color: "#FF00FF", name: "Magenta" },
	{ id: 6, color: "#00FFFF", name: "Cyan" },
	{ id: 7, color: "#FFFFFF", name: "White" },
	{ id: 8, color: "#000000", name: "Black" },
];

const STRATEGIES = ["none", "10%", "5%", "adaptive"] as const;

type Strategy = (typeof STRATEGIES)[number];

const STRATEGY_DESCRIPTIONS: Record<Strategy, string> = {
	none: "No neighbor avoidance - always use best match",
	"10%": "10% tolerance - avoid neighbors when within 10% match quality",
	"5%": "5% tolerance - avoid neighbors when within 5% match quality",
	adaptive: "Adaptive tolerance - higher in complex regions",
};

function resolveColorIndex(
	sourceType: string,
	row: number,
	col: number,
	gridSize: number,
	colorCount: number,
): number {
	if (sourceType === "gradient") {
		const ratio = (row + col) / (2 * gridSize);
		return Math.floor(ratio * colorCount);
	}
	if (sourceType === "solid") {
		return 0;
	}
	return (row + col) % colorCount;
}

function shouldSubstitute(strategy: Strategy, sourceType: string): boolean {
	switch (strategy) {
		case "10%":
			return Math.random() < 0.1;
		case "5%":
			return Math.random() < 0.05;
		case "adaptive":
			return Math.random() < (sourceType === "pattern" ? 0.15 : 0.05);
		default:
			return false;
	}
}

function cellTitle(cell: MosaicCell): string {
	if (cell.avoidAbove) return "Avoided above";
	if (cell.avoidLeft) return "Avoided left";
	return "";
}

function generateMockMosaic(
	sourceType: string,
	strategy: Strategy,
	tesserae: Tessera[],
	gridSize: number,
): MosaicCell[][] {
	const grid: MosaicCell[][] = [];
	const colors = tesserae.map((t) => t.color);

	for (let row = 0; row < gridSize; row++) {
		const rowCells: MosaicCell[] = [];
		for (let col = 0; col < gridSize; col++) {
			let colorIndex = resolveColorIndex(
				sourceType,
				row,
				col,
				gridSize,
				colors.length,
			);

			if (strategy !== "none" && row > 0 && col > 0) {
				const aboveColor = grid[row - 1][col].color;
				const leftColor = rowCells[col - 1].color;

				if (
					aboveColor === colors[colorIndex] ||
					leftColor === colors[colorIndex]
				) {
					if (shouldSubstitute(strategy, sourceType)) {
						colorIndex = (colorIndex + 1) % colors.length;
					}
				}
			}

			rowCells.push({
				color: colors[colorIndex],
				tesseraId: tesserae[colorIndex].id,
				avoidAbove:
					row > 0 && grid[row - 1][col].tesseraId === tesserae[colorIndex].id,
				avoidLeft:
					col > 0 && rowCells[col - 1].tesseraId === tesserae[colorIndex].id,
			});
		}
		grid.push(rowCells);
	}

	return grid;
}

const MosaicGrid = ({
	grid,
	title,
}: {
	grid: MosaicCell[][];
	title: string;
}) => {
	const gridSize = grid.length;
	const cellSize = Math.max(200 / gridSize, 5);

	return (
		<div className="mosaic-visualization">
			<h3>{title}</h3>
			<div
				className="mosaic-grid"
				style={{
					display: "grid",
					gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
					gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
					gap: "1px",
					border: "1px solid #ccc",
					width: "fit-content",
					margin: "10px 0",
				}}
			>
				{grid.flat().map((cell, index) => {
					const row = Math.floor(index / gridSize);
					const col = index % gridSize;
					return (
						<div
							key={`${row}-${col}`}
							style={{
								backgroundColor: cell.color,
								border:
									cell.avoidAbove || cell.avoidLeft
										? "1px dashed #000"
										: "none",
								boxSizing: "border-box",
							}}
							title={cellTitle(cell)}
						/>
					);
				})}
			</div>
			<div className="legend">
				<small>
					Dashed borders indicate neighbor avoidance. Grid size: {gridSize}×
					{gridSize}
				</small>
			</div>
		</div>
	);
};

const PrototypeSwitcher = ({
	variants,
	current,
	onSwitch,
}: {
	variants: readonly Strategy[];
	current: Strategy;
	onSwitch: (variant: Strategy) => void;
}) => {
	return (
		<div
			style={{
				position: "fixed",
				bottom: "20px",
				left: "50%",
				transform: "translateX(-50%)",
				backgroundColor: "#333",
				color: "white",
				padding: "10px 15px",
				borderRadius: "20px",
				display: "flex",
				alignItems: "center",
				gap: "10px",
				zIndex: 1000,
				boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
			}}
		>
			<button
				type="button"
				onClick={() => {
					const currentIndex = variants.indexOf(current);
					const prevIndex =
						(currentIndex - 1 + variants.length) % variants.length;
					onSwitch(variants[prevIndex]);
				}}
				style={{
					background: "none",
					border: "none",
					color: "white",
					cursor: "pointer",
				}}
			>
				←
			</button>

			<span>
				Strategy: {current} ({variants.indexOf(current) + 1}/{variants.length})
			</span>

			<button
				type="button"
				onClick={() => {
					const currentIndex = variants.indexOf(current);
					const nextIndex = (currentIndex + 1) % variants.length;
					onSwitch(variants[nextIndex]);
				}}
				style={{
					background: "none",
					border: "none",
					color: "white",
					cursor: "pointer",
				}}
			>
				→
			</button>
		</div>
	);
};

// Main prototype component
export const NeighborAvoidancePrototype = () => {
	const searchParams = new URLSearchParams(window.location.search);
	const initialVariant = (searchParams.get("variant") as Strategy) || "none";
	const initialSource = searchParams.get("source") || "gradient";
	const initialGridSize = parseInt(searchParams.get("grid") || "16", 10);

	const [currentVariant, setCurrentVariant] =
		useState<Strategy>(initialVariant);
	const [currentSource, setCurrentSource] = useState(initialSource);
	const [gridSize, setGridSize] = useState(initialGridSize);

	useEffect(() => {
		const url = new URL(window.location.href);
		url.searchParams.set("variant", currentVariant);
		url.searchParams.set("source", currentSource);
		url.searchParams.set("grid", gridSize.toString());
		window.history.replaceState({}, "", url.toString());
	}, [currentVariant, currentSource, gridSize]);

	const mosaicGrid = generateMockMosaic(
		currentSource,
		currentVariant,
		MOCK_TESSERAE,
		gridSize,
	);

	return (
		<div className="prototype-container" style={{ padding: "20px" }}>
			<div
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					backgroundColor: "#ffeb3b",
					color: "#000",
					padding: "10px",
					textAlign: "center",
					zIndex: 1000,
					fontSize: "14px",
				}}
			>
				⚠️ PROTOTYPE - NOT FOR PRODUCTION ⚠️ This is throwaway code for evaluating
				neighbor avoidance strategies
			</div>

			<h2>Direct-Neighbor Avoidance Strategy Evaluation</h2>

			<div style={{ marginBottom: "20px" }}>
				<div
					style={{
						display: "flex",
						gap: "20px",
						flexWrap: "wrap",
						alignItems: "flex-end",
					}}
				>
					<div>
						<label>
							Source Image Type:
							<select
								value={currentSource}
								onChange={(e) => setCurrentSource(e.target.value)}
								style={{ marginLeft: "10px", padding: "5px" }}
							>
								{MOCK_SOURCE_IMAGES.map((source) => (
									<option key={source.id} value={source.type}>
										{source.name}
									</option>
								))}
							</select>
						</label>
					</div>

					<div>
						<label>
							Grid Size:
							<input
								type="range"
								min="8"
								max="32"
								value={gridSize}
								onChange={(e) => setGridSize(parseInt(e.target.value, 10))}
								style={{ marginLeft: "10px", width: "100px" }}
							/>
							<span style={{ marginLeft: "10px" }}>
								{gridSize}×{gridSize}
							</span>
						</label>
					</div>

					<div>
						<strong>Current Strategy:</strong>{" "}
						{STRATEGY_DESCRIPTIONS[currentVariant]}
					</div>
				</div>
			</div>

			<div style={{ marginBottom: "30px" }}>
				<MosaicGrid
					grid={mosaicGrid}
					title={`Mosaic with ${STRATEGY_DESCRIPTIONS[currentVariant]} strategy`}
				/>
			</div>

			<div style={{ marginBottom: "20px" }}>
				<h3>Legend</h3>
				<div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
					{MOCK_TESSERAE.map((tessera) => (
						<div
							key={tessera.id}
							style={{ display: "flex", alignItems: "center", gap: "5px" }}
						>
							<div
								style={{
									width: "20px",
									height: "20px",
									backgroundColor: tessera.color,
									border: "1px solid #333",
								}}
							/>
							<span>{tessera.name}</span>
						</div>
					))}
				</div>
			</div>

			<div style={{ marginBottom: "20px" }}>
				<h3>Observations</h3>
				<div
					style={{
						backgroundColor: "#f5f5f5",
						padding: "15px",
						borderRadius: "5px",
						maxWidth: "800px",
					}}
				>
					<ul>
						<li>
							<strong>Unrestricted matching</strong> (no avoidance): Creates
							visible clusters in solid-color regions but maintains best color
							accuracy
						</li>
						<li>
							<strong>10% tolerance</strong>: Reduces obvious repetition while
							preserving most accuracy
						</li>
						<li>
							<strong>5% tolerance</strong>: Minimal avoidance, nearly identical
							to unrestricted but with slight variety improvement
						</li>
						<li>
							<strong>Adaptive tolerance</strong>: Higher avoidance in detailed
							regions, lower in uniform regions
						</li>
					</ul>

					<p>
						<strong>Key insight:</strong> In uniform regions (like sky or
						walls), neighbor avoidance significantly improves visual appeal
						without noticeable quality loss. In detailed regions, excessive
						avoidance can harm resemblance to the source image.
					</p>
				</div>
			</div>

			<PrototypeSwitcher
				variants={STRATEGIES}
				current={currentVariant}
				onSwitch={setCurrentVariant}
			/>
		</div>
	);
};
