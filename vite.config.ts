import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "node:url";
import { componentTagger } from "lovable-tagger";
import {
  componentTaggerOptions,
  shouldEnableComponentTagger,
} from "./scripts/componentTaggerPolicy";
import { seoBuildGate } from "./scripts/seoBuildGate";
import {
  assertProductionFingerprint,
  buildReleaseFingerprint,
  resolveReleaseSource,
} from "./scripts/releaseMetadata";

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));

function releaseFingerprintPlugin(
  fingerprint: ReturnType<typeof buildReleaseFingerprint>,
): Plugin {
  return {
    name: 'aura-release-fingerprint',
    apply: 'build',
    buildStart() {
      // Fail-closed: a release bundle may never ship unknown provenance.
      assertProductionFingerprint(fingerprint);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'release.json',
        source: `${JSON.stringify(fingerprint, null, 2)}\n`,
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
  const buildStartedAt = new Date();
  const productionFingerprint = mode !== "development"
    ? buildReleaseFingerprint({
        rootDir: PROJECT_ROOT,
        isReleaseBuild: true,
        now: buildStartedAt,
      })
    : null;
  const releaseSha = productionFingerprint?.sha
    ?? resolveReleaseSource({ rootDir: PROJECT_ROOT }).sha;
  const buildTimestamp = productionFingerprint?.builtAt
    ?? buildStartedAt.toISOString();
  const buildId = productionFingerprint?.buildId
    ?? process.env.AURA_BUILD_ID
    ?? `b${buildStartedAt.getTime().toString(36)}`;
  const appVersion = productionFingerprint?.version
    ?? process.env.npm_package_version
    ?? '1.0.0';

  return {
    server: {
      host: "::",
      port: 8080,
      ...(kitProxy() ? { proxy: kitProxy() } : {}),
    },
    plugins: [
      react(),
      // Dev-only JSX instrumentation. Automated runs that assert console
      // cleanliness disable it via AURA_DISABLE_COMPONENT_TAGGER: the tagger
      // attaches a callback ref to every JSX element, and React 18 warns
      // "Function components cannot be given refs" once per JSX call site,
      // flooding console-cleanliness gates (see scripts/componentTaggerPolicy).
      // Options are passed EXPLICITLY: lovable-tagger otherwise defaults both
      // features to LOVABLE_DEV_SERVER === 'true' and silently no-ops.
      shouldEnableComponentTagger(mode) && componentTagger(componentTaggerOptions()),

      mode !== "development"
        && productionFingerprint
        && releaseFingerprintPlugin(productionFingerprint),
      // Hard gate: fails `vite build` (and therefore Lovable publish) if
      // the produced dist/ has SEO errors. Bypass with SKIP_SEO_GATE=1.
      mode !== "development" && seoBuildGate(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(PROJECT_ROOT, "./src"),
      },
    },
    define: {
      'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(appVersion),
      'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
      // Non-sensitive deployment fingerprint. The same SHA is also emitted to
      // /release.json so release verification can compare the live site to Git.
      __AURA_BUILD_ID__: JSON.stringify(buildId),
      __AURA_COMMIT_SHA__: JSON.stringify(releaseSha),
      __AURA_BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
      __AURA_APP_VERSION__: JSON.stringify(appVersion),
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

