import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
  },
  server: {
    port: 3000,
    proxy: {
      // Forward /api/* or /api/v1/* to the local PHP server during development
      // Run: php -S localhost:8080 -t backend
      '^/api.*': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // Rewrite /api/v1/blogs.php to /blogs.php if your local php server is pointed directly at the backend folder
        rewrite: (path) => path.replace(/^\/api(\/v1)?/, ''),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
