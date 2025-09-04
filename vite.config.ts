import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, process: true },
      protocolImports: true,
    }),
  ],
  define: {
    global: "globalThis",
    "process.env": {},
  },
  resolve: {
    alias: {
      stream: "stream-browserify",
      buffer: "buffer",
      process: "process/browser",
      util: "util",
      url: "url",
      http: "stream-http",
      https: "https-browserify",
      events: "events",
    },
  },
});
