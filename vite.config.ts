import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), mcpPlugin()],
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@radix-ui/react-tooltip",
    ],
  },
  server: {
    host: "::",
    port: 8080,
  },
});
