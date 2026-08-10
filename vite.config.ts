import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./api/supabasePublic";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Local dev: mirror Vercel /api/fn/* → Supabase functions
      "/api/fn": {
        target: SUPABASE_URL,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/fn/, "/functions/v1"),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
            proxyReq.setHeader("apikey", SUPABASE_ANON_KEY);
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
