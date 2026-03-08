import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    // Basic polyfills for libraries that expect a Node environment
    global: "window",
    "process.env": {},
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // Crucial: Let Vite pre-bundle the Zoom SDK to avoid 'module/require is not defined'
    include: ["@zoom/meetingsdk"],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
});
