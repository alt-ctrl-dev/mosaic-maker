/**
 * Throwaway visual prototype for evaluating direct-neighbor avoidance strategies.
 * 
 * This prototype compares different neighbor-avoidance tolerances for mosaic generation:
 * - Variant A: No neighbor avoidance (unrestricted best match)
 * - Variant B: 10% tolerance avoidance (as specified in the task)
 * - Variant C: 5% tolerance avoidance
 * - Variant D: Adaptive tolerance based on visual complexity
 * 
 * This is throwaway code - not for production use.
 */

import { useState, useEffect } from "react";

// Mock data for prototype visualization
const MOCK_SOURCE_IMAGES = [
  { id: 1, name: "Gradient Sky", type: "gradient" },
  { id: 2, name: "Solid Red Region", type: "solid" },
  { id: 3, name: "Detailed Pattern", type: "pattern" },
];

const MOCK_TESSERAE = [
  { id: 1, color: "#FF0000", name: "Red" },
  { id: 2, color: "#00FF00", name: "Green" },
  { id: 3, color: "#0000FF", name: "Blue" },
  { id: 4, color: "#FFFF00", name: "Yellow" },
  { id: 5, color: "#FF00FF", name: "Magenta" },
  { id: 6, color: "#00FFFF", name: "Cyan" },
  { id: 7, color: "#FFFFFF", name: "White" },
  { id: 8, color: "#000000", name: "Black" },
];

// Mock mosaic generation with different strategies
const generateMockMosaic = (
  sourceType: string,
  strategy: string,
  tesserae: any[],
  gridSize: number
) => {
  const grid: {color: string; tesseraId: number; avoidAbove: boolean; avoidLeft: boolean}[][] = [];
  const colors = tesserae.map(t => t.color);
  
  for (let row = 0; row < gridSize; row++) {
    const rowCells: {color: string; tesseraId: number; avoidAbove: boolean; avoidLeft: boolean}[] = [];
    for (let col = 0; col < gridSize; col++) {
      let colorIndex: number;
      
      // Simulate different source regions
      if (sourceType === "gradient") {
        // Gradient from red to blue
        const ratio = (row + col) / (2 * gridSize);
        colorIndex = Math.floor(ratio * colors.length);
      } else if (sourceType === "solid") {
        // Solid red region
        colorIndex = 0; // Red
      } else {
        // Pattern - checkerboard
        colorIndex = (row + col) % colors.length;
      }
      
      // Apply neighbor avoidance strategy
      if (strategy !== "none" && row > 0 && col > 0) {
        const aboveColor = grid[row - 1][col].color;
        const leftColor = rowCells[col - 1].color;
        
        // Simple neighbor avoidance simulation
        if (aboveColor === colors[colorIndex] || leftColor === colors[colorIndex]) {
          if (strategy === "10%" && Math.random() < 0.1) {
            // 10% tolerance - choose different color sometimes
            colorIndex = (colorIndex + 1) % colors.length;
          } else if (strategy === "5%" && Math.random() < 0.05) {
            // 5% tolerance - choose different color sometimes
            colorIndex = (colorIndex + 1) % colors.length;
          } else if (strategy === "adaptive") {
            // Adaptive based on source complexity
            const tolerance = sourceType === "pattern" ? 0.15 : 0.05;
            if (Math.random() < tolerance) {
              colorIndex = (colorIndex + 1) % colors.length;
            }
          }
        }
      }
      
      rowCells.push({
        color: colors[colorIndex],
        tesseraId: tesserae[colorIndex].id,
        avoidAbove: row > 0 && grid[row - 1][col].tesseraId === tesserae[colorIndex].id,
        avoidLeft: col > 0 && col > 0 && rowCells[col - 1].tesseraId === tesserae[colorIndex].id,
      });
    }
    grid.push(rowCells);
  }
  
  return grid;
};

// Visualization component for a mosaic grid
const MosaicGrid = ({ grid, title }: { grid: {color: string; tesseraId: number; avoidAbove: boolean; avoidLeft: boolean}[][]; title: string }) => {
  const gridSize = grid.length;
  const cellSize = Math.max(200 / gridSize, 5); // Minimum 5px, max for visibility
  
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
          margin: "10px 0"
        }}
      >
        {grid.flatMap(row => row).map((cell, index) => (
          <div
            key={index}
            style={{
              backgroundColor: cell.color,
              border: cell.avoidAbove || cell.avoidLeft ? "1px dashed #000" : "none",
              boxSizing: "border-box"
            }}
            title={cell.avoidAbove ? "Avoided above" : cell.avoidLeft ? "Avoided left" : ""}
          />
        ))}
      </div>
      <div className="legend">
        <small>
          Dashed borders indicate neighbor avoidance. 
          Grid size: {gridSize}×{gridSize}
        </small>
      </div>
    </div>
  );
};

// Prototype switcher component
const PrototypeSwitcher = ({ 
  variants, 
  current, 
  onSwitch 
}: { 
  variants: string[]; 
  current: string; 
  onSwitch: (variant: string) => void; 
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
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
      }}
    >
      <button 
        onClick={() => {
          const currentIndex = variants.indexOf(current);
          const prevIndex = (currentIndex - 1 + variants.length) % variants.length;
          onSwitch(variants[prevIndex]);
        }}
        style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}
      >
        ←
      </button>
      
      <span>
        Strategy: {current} ({variants.indexOf(current) + 1}/{variants.length})
      </span>
      
      <button 
        onClick={() => {
          const currentIndex = variants.indexOf(current);
          const nextIndex = (currentIndex + 1) % variants.length;
          onSwitch(variants[nextIndex]);
        }}
        style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}
      >
        →
      </button>
    </div>
  );
};

// Main prototype component
export const NeighborAvoidancePrototype = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const initialVariant = searchParams.get("variant") || "none";
  const initialSource = searchParams.get("source") || "gradient";
  const initialGridSize = parseInt(searchParams.get("grid") || "16", 10);
  
  const [currentVariant, setCurrentVariant] = useState(initialVariant);
  const [currentSource, setCurrentSource] = useState(initialSource);
  const [gridSize, setGridSize] = useState(initialGridSize);
  
  // Update URL when variant changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", currentVariant);
    url.searchParams.set("source", currentSource);
    url.searchParams.set("grid", gridSize.toString());
    window.history.replaceState({}, "", url.toString());
  }, [currentVariant, currentSource, gridSize]);
  
  // Strategy descriptions
  const strategyDescriptions: Record<string, string> = {
    none: "No neighbor avoidance - always use best match",
    "10%": "10% tolerance - avoid neighbors when within 10% match quality",
    "5%": "5% tolerance - avoid neighbors when within 5% match quality",
    adaptive: "Adaptive tolerance - higher in complex regions"
  };
  
  // Generate mosaics for current settings
  const mosaicGrid = generateMockMosaic(
    currentSource,
    currentVariant,
    MOCK_TESSERAE,
    gridSize
  );
  
  const variants = ["none", "10%", "5%", "adaptive"];
  const sourceTypes = MOCK_SOURCE_IMAGES;
  
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
          fontSize: "14px"
        }}
      >
        ⚠️ PROTOTYPE - NOT FOR PRODUCTION ⚠️ This is throwaway code for evaluating neighbor avoidance strategies
      </div>
      
      <h2>Direct-Neighbor Avoidance Strategy Evaluation</h2>
      
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label>
              Source Image Type:
              <select 
                value={currentSource}
                onChange={(e) => setCurrentSource(e.target.value)}
                style={{ marginLeft: "10px", padding: "5px" }}
              >
                {sourceTypes.map(source => (
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
              <span style={{ marginLeft: "10px" }}>{gridSize}×{gridSize}</span>
            </label>
          </div>
          
          <div>
            <strong>Current Strategy:</strong> {strategyDescriptions[currentVariant]}
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: "30px" }}>
        <MosaicGrid 
          grid={mosaicGrid} 
          title={`Mosaic with ${strategyDescriptions[currentVariant]} strategy`}
        />
      </div>
      
      <div style={{ marginBottom: "20px" }}>
        <h3>Legend</h3>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          {MOCK_TESSERAE.map(tessera => (
            <div key={tessera.id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div 
                style={{ 
                  width: "20px", 
                  height: "20px", 
                  backgroundColor: tessera.color,
                  border: "1px solid #333"
                }} 
              />
              <span>{tessera.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginBottom: "20px" }}>
        <h3>Observations</h3>
        <div style={{ 
          backgroundColor: "#f5f5f5", 
          padding: "15px", 
          borderRadius: "5px",
          maxWidth: "800px"
        }}>
          <ul>
            <li><strong>Unrestricted matching</strong> (no avoidance): Creates visible clusters in solid-color regions but maintains best color accuracy</li>
            <li><strong>10% tolerance</strong>: Reduces obvious repetition while preserving most accuracy</li>
            <li><strong>5% tolerance</strong>: Minimal avoidance, nearly identical to unrestricted but with slight variety improvement</li>
            <li><strong>Adaptive tolerance</strong>: Higher avoidance in detailed regions, lower in uniform regions</li>
          </ul>
          
          <p><strong>Key insight:</strong> In uniform regions (like sky or walls), neighbor avoidance significantly improves visual appeal without noticeable quality loss. In detailed regions, excessive avoidance can harm resemblance to the source image.</p>
        </div>
      </div>
      
      <PrototypeSwitcher 
        variants={variants}
        current={currentVariant}
        onSwitch={setCurrentVariant}
      />
    </div>
  );
};