import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Allow overriding backend URL via VITE_API_URL environment variable
const backendUrl = process.env.VITE_API_URL || 'http://127.0.0.1:8001';;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5000,
    host: "0.0.0.0",
    allowedHosts: [".replit.dev", ".repl.co", "localhost", "127.0.0.1"],
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
      "/uploads": {
        target: backendUrl,
        changeOrigin: true,
      },
      "/socket.io": {
        target: backendUrl,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
