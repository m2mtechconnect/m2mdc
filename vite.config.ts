import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { seoBuildGate } from "./scripts/seoBuildGate";

// Phase 1A hardening: no hard-coded Kit endpoint. The dev proxy is registered
// only when `VITE_OMNIVERSE_KIT_URL` is set; otherwise `/kit-api` requests
// return the default Vite 404 (fail-closed) and the app runs in demo mode.
function kitProxy() {
  const target = process.env.VITE_OMNIVERSE_KIT_URL?.trim();
  if (!target) return undefined;
  try {
    const u = new URL(target);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
  } catch {
    return undefined;
  }
  return {
    '/kit-api': {
      target,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/kit-api/, ''),
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    ...(kitProxy() ? { proxy: kitProxy() } : {}),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Hard gate: fails `vite build` (and therefore Lovable publish) if
    // the produced dist/ has SEO errors. Bypass with SKIP_SEO_GATE=1.
    mode !== "development" && seoBuildGate(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString()),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
            '@radix-ui/react-scroll-area',
          ],
          'vendor-charts': ['recharts'],
          'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
