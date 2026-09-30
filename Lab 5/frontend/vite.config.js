import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Fixed port so the origin the API allows in CORS_ORIGINS never drifts.
    port: 5173,
    strictPort: true
  }
});
