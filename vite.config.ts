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
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@radix-ui/react-tooltip"],
  },
  server: {
    host: "::",
    port: 8080,
  },
});
