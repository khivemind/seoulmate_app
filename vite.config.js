import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: ["www.seoulmate.cloud"],
    strictPort: true,
    hmr: {
      clientPort: 443,
    },
    proxy: {
      "/v1": {
        target: "https://api.seoulmate.cloud",
        changeOrigin: true,
      },
    },
  },
});
