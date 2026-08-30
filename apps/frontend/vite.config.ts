import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // ContextOS backend — all API paths
      "/projects":  "http://localhost:8000",
      "/nodes":     "http://localhost:8000",
      "/health":    "http://localhost:8000",
      "/watcher":   "http://localhost:8000",
      "/scenarios": "http://localhost:8000",
      "/evidence":  "http://localhost:8000",
    },
  },
});
