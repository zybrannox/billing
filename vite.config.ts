import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// Third-party code is split into a few long-lived vendor chunks: they change
// far less often than the app, so a returning visitor's browser keeps them
// cached across deploys and only re-downloads the app code that changed.
// Page-level code is split separately by the lazy() routes in App.tsx.
function vendorChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  const pkg = (name: string) => id.includes(`/node_modules/${name}/`);

  // Only the always-needed base is pinned. The heavy feature libraries (data
  // grid, date pickers, PDF export) are deliberately NOT given manual chunks:
  // Rollup splits them automatically along the lazy() route boundaries, so
  // they load only with the pages that import them. Forcing them into named
  // chunks made them statically reachable from the base chunks instead - a
  // data-grid download on the login page.
  if (
    ["react", "react-dom", "react-router", "react-router-dom", "scheduler", "react-is", "prop-types", "clsx"].some(pkg) ||
    id.includes("/@babel/runtime/")
  ) {
    return "vendor-react";
  }
  // Core MUI + emotion only; the "@mui/x-*" packages (data grid, date pickers)
  // are the heavy feature libraries described above and stay out of this one.
  if ((id.includes("/@mui/") && !id.includes("/@mui/x-")) || id.includes("/@emotion/") || id.includes("/stylis/")) {
    return "vendor-mui";
  }
  if (["@tanstack/react-query", "@tanstack/query-core", "zustand", "axios"].some(pkg)) return "vendor-data";
  return undefined;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: [
      'robin-concentrate-circle-kit.trycloudflare.com',
      'localhost' // keep localhost allowed
    ],
  },
  build: {
    rollupOptions: {
      output: { manualChunks: vendorChunk },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
