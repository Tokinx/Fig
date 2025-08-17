import path from "path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const base = {
  local: "/",
  github: `https://tokinx.github.io/Fig/pages/`,
  proxy: `/pages/`,
};

export default defineConfig({
  plugins: [vue()],
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
