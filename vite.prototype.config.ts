import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Simple config for running prototypes
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist-prototype",
  },
  server: {
    open: "/prototype.html",
  },
});