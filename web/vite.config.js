import path from "path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import { fileURLToPath, URL } from "node:url";

const base = {
  local: "/",
  github: `https://tokinx.github.io/Fig/pages/`,
  proxy: `/pages/`,
};

export default defineConfig({
  server: {
    host: "0.0.0.0", // 监听所有地址
    port: 5173,
    strictPort: true,
  },
  plugins: [
    vue(),
    VueI18nPlugin({
      include: path.resolve(__dirname, "./src/locales/**/*.json"),
      runtimeOnly: false,
    }),
  ],
  base: process.env.ENV === "production" ? base.proxy : base.local,
  build: {
    outDir: "dist",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
