import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { rmSync } from "fs";
import type { Plugin } from "vite";

// public/data holds the local JSON database (patients, appointments, tokens). Vite copies
// everything in public/ into the build, so remove it to make sure it is never deployed.
const excludePrivateData = (): Plugin => {
  let outDir = "dist";
  return {
    name: "exclude-private-data",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      rmSync(path.join(outDir, "data"), { recursive: true, force: true });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/app/",
  server: {
    host: "::",
    port: Number(process.env.DEV_PORT ?? 8081),
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    excludePrivateData(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
