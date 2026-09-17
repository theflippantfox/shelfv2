import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  envDir: resolve(import.meta.dirname, "../.."),
  server: {
    proxy: {
      "/api": {
        target: process.env.PUBLIC_API_URL || "http://127.0.0.1:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
