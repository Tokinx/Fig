import path from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
  plugins: [
    vue(),
    VueI18nPlugin({
      include: path.resolve(rootDir, "./src/web/locales/**/*.json"),
      runtimeOnly: false,
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src/web"),
    },
  },
});
