import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// PORT y BASE_PATH: use defaults si no están seteados (CI-safe)
const port    = Number(process.env.PORT ?? "3000");
const basePath = process.env.BASE_PATH ?? "/";
const isDev   = process.env.NODE_ENV !== "production";
const isReplit = isDev && process.env.REPL_ID !== undefined;

export default defineConfig(async () => {
  // Plugins de Replit — solo en dev dentro de Replit, nunca en CI
  const replitPlugins = isReplit
    ? await Promise.all([
        import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default()),
        import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer({ root: path.resolve(import.meta.dirname, "..") })
        ),
        import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
      ])
    : [];

  return {
    base: basePath,
    plugins: [
      nodePolyfills({
        include: ["buffer", "process", "events", "stream", "util"],
        globals: { Buffer: true, process: true },
      }),
      react(),
      tailwindcss(),
      ...replitPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: { strict: true, deny: ["**/.*"] },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
