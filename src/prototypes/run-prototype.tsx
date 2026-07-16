/**
 * Simple runner for the neighbor avoidance prototype.
 * This is throwaway code - not for production use.
 */

import { createRoot } from "react-dom/client";
import { NeighborAvoidancePrototype } from "./neighbor-avoidance-prototype";

const rootElement = document.getElementById("prototype-root");
if (rootElement) {
  createRoot(rootElement).render(<NeighborAvoidancePrototype />);
} else {
  // Create a root element if it doesn't exist
  const rootContainer = document.createElement("div");
  rootContainer.id = "prototype-root";
  rootContainer.style.position = "fixed";
  rootContainer.style.top = "0";
  rootContainer.style.left = "0";
  rootContainer.style.width = "100%";
  rootContainer.style.height = "100%";
  rootContainer.style.zIndex = "9999";
  rootContainer.style.backgroundColor = "white";
  document.body.appendChild(rootContainer);
  
  createRoot(rootContainer).render(<NeighborAvoidancePrototype />);
}