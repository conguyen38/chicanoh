import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/konva") || id.includes("node_modules/react-konva")) {
            return "canvas";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
          if (
            id.includes("node_modules/read-excel-file") ||
            id.includes("node_modules/papaparse")
          ) {
            return "sheet-import";
          }
          return undefined;
        }
      }
    }
  }
});
