import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (
            id.includes("/react-router") ||
            id.includes("/react-dom") ||
            id.match(/[\\/]react[\\/]/)
          ) {
            return "react-vendor";
          }
          if (id.includes("@tanstack/react-query")) return "query-vendor";
          if (id.includes("socket.io-client")) return "socket-vendor";
          if (id.includes("dompurify")) return "sanitize-vendor";
          if (id.includes("axios")) return "axios-vendor";
          if (
            id.includes("react-icons") ||
            id.includes("react-toastify") ||
            id.includes("react-helmet-async")
          ) {
            return "ui-vendor";
          }
          if (id.includes("zustand")) return "state-vendor";
          return "vendor";
        },
      },
    },
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
  },
});
