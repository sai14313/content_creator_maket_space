import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server config — proxies /api to FastAPI so the frontend
// can also work in same-origin mode if desired.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
