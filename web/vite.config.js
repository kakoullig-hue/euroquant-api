import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// index.html is the static commerce landing page served as-is by Render —
// the React Risk Terminal builds from its own entry so the two never collide.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: resolve(__dirname, "dashboard.html"),
    },
  },
  server: {
    open: "/dashboard.html",
  },
});
