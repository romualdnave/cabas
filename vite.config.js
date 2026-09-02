import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site under /<repo>/, so assets cannot be requested
  // from the domain root. Left as "/" for local dev and for any host that
  // serves the site at the root; the Pages workflow sets it to "/cabas/".
  base: process.env.VITE_BASE || "/",
  server: { port: 5173 },
});
