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
    // Non-sensitive deployment fingerprint, read back from <html> data attrs.
    __AURA_BUILD_ID__: JSON.stringify(
      process.env.AURA_BUILD_ID ||
        `b${Date.now().toString(36)}`,
    ),
    __AURA_COMMIT_SHA__: JSON.stringify(
      process.env.AURA_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    ),
    __AURA_BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
    __AURA_APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // `@react-three/fiber` also imports react-dom/client. Keeping that
          // subpath in the React chunk prevents Rollup from placing the app
          // bootstrap in vendor-3d and forcing ~900 kB of 3D code onto the
          // unauthenticated landing route.
          'vendor-react': ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
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
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
