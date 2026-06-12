import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// index.html is the static commerce landing page served as-is by Render —
// the React Risk Terminal builds from its own entry so the two never collide.
export default defineConfig(({ command, mode }) => {
  // Demo-only production builds: a public bundle must never embed a gateway
  // key (Vite inlines every VITE_* var into the shipped JS). Keys are for
  // local dev against the live API only — `vite dev` stays allowed.
  if (command === "build") {
    const env = loadEnv(mode, __dirname, "");
    if (env.VITE_API_KEY) {
      throw new Error(
        "[euroquant] BUILD BLOCKED: VITE_API_KEY is set (shell env or web/.env*). " +
          "Production builds are demo-only — the key would be embedded in the public bundle. " +
          "Unset it and rebuild.",
      );
    }
  }

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "dashboard.html"),
      },
    },
    server: {
      open: "/dashboard.html",
    },
  };
});
