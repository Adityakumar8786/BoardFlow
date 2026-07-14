// vite.config.js
// Purpose: Vite build configuration. Proxies /api and /socket.io calls to the backend
// during development so the frontend can use relative URLs (no hardcoded localhost:5000).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
      "/socket.io": { target: "http://localhost:5000", changeOrigin: true, ws: true },
    },
  },
});
