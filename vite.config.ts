import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execFileSync } from "node:child_process";
import { componentTagger } from "lovable-tagger";
import { seoBuildGate } from "./scripts/seoBuildGate";

function resolveGitValue(args: string[], fallback = 'unknown') {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function resolveReleaseSha() {
  return (
    process.env.AURA_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.CI_COMMIT_SHA ||
    resolveGitValue(['rev-parse', 'HEAD'])
  ).trim();
}

function resolveReleaseBranch() {
  return (
    process.env.AURA_RELEASE_BRANCH ||
    process.env.GITHUB_HEAD_REF ||
    process.env.GITHUB_REF_NAME ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.CI_COMMIT_REF_NAME ||
    resolveGitValue(['rev-parse', '--abbrev-ref', 'HEAD'])
  ).trim();
}

function releaseFingerprint(): Plugin {
  const sha = resolveReleaseSha();
  const branch = resolveReleaseBranch();
  const builtAt = new Date().toISOString();
  const buildId = process.env.AURA_BUILD_ID || `b${Date.now().toString(36)}`;
  const environment = process.env.AURA_RELEASE_ENVIRONMENT || 'unknown';
  const version = process.env.npm_package_version || '1.0.0';

  return {
    name: 'aura-release-fingerprint',
    apply: 'build',
    generateBundle() {
      const payload = {
        schema: 'aura.release-fingerprint.v1',
        sha,
        branch,
        builtAt,
        buildId,
        environment,
        version,
      };
      this.emitFile({
        type: 'asset',
        fileName: 'release.json',
        source: `${JSON.stringify(payload, null, 2)}\n`,
      });
    },
  };
}

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
export default defineConfig(({ mode }) => {
  const releaseSha = resolveReleaseSha();
  const buildTimestamp = new Date().toISOString();
  const buildId = process.env.AURA_BUILD_ID || `b${Date.now().toString(36)}`;

  return {
    server: {
      host: "::",
      port: 8080,
      ...(kitProxy() ? { proxy: kitProxy() } : {}),
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      mode !== "development" && releaseFingerprint(),
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
      'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
      // Non-sensitive deployment fingerprint. The same SHA is also emitted to
      // /release.json so release verification can compare the live site to Git.
      __AURA_BUILD_ID__: JSON.stringify(buildId),
      __AURA_COMMIT_SHA__: JSON.stringify(releaseSha),
      __AURA_BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
      __AURA_APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    },
    build: {
      // Source maps are useful to Lighthouse and CI diagnostics, but publishing
      // them with the production bundle is unnecessary. Generate them only for
      // the dedicated Lighthouse build.
      sourcemap: process.env.LIGHTHOUSE_CI === '1',
      rollupOptions: {
        output: {
          manualChunks: {
            // `@react-three/fiber` also imports react-dom/client. Keep React's
            // bootstrap dependencies together, but let the 3D runtime follow
            // the lazy authenticated route graph instead of forcing a global
            // vendor chunk that Vite modulepreloads on the public landing page.
            'vendor-react': ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
            // Runtime-only libraries retain their own lazy chunks. Radix and
            // Recharts are intentionally NOT forced into global vendor chunks:
            // doing so made Vite preload ~160 kB gzip of UI/chart code on `/`
            // even though the anonymous hero does not use those packages.
            'vendor-query': ['@tanstack/react-query'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-motion': ['framer-motion'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
