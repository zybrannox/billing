import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: [
      'robin-concentrate-circle-kit.trycloudflare.com',
      'localhost' // keep localhost allowed
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
