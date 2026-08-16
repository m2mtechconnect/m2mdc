/**
 * Non-sensitive build fingerprint.
 *
 * Deployment verification needs to prove which bundle a host is serving.
 * The values below are stamped at build time by `vite.config.ts` `define`
 * and published to the DOM as data attributes on <html>, so a runtime probe
 * can read them without any privileged surface or extra floating panel.
 */
import manifest from '../../assets/manifest.json';

export interface BuildFingerprint {
  buildId: string;
  commitSha: string;
  buildTimestamp: string;
  appVersion: string;
  manifestVersion: string;
}

declare const __AURA_BUILD_ID__: string;
declare const __AURA_COMMIT_SHA__: string;
declare const __AURA_BUILD_TIMESTAMP__: string;
declare const __AURA_APP_VERSION__: string;

function safe(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export function getBuildFingerprint(): BuildFingerprint {
  return {
    buildId: safe(typeof __AURA_BUILD_ID__ !== 'undefined' ? __AURA_BUILD_ID__ : null, 'dev'),
    commitSha: safe(typeof __AURA_COMMIT_SHA__ !== 'undefined' ? __AURA_COMMIT_SHA__ : null, 'unknown'),
    buildTimestamp: safe(
      typeof __AURA_BUILD_TIMESTAMP__ !== 'undefined' ? __AURA_BUILD_TIMESTAMP__ : null,
      'unknown',
    ),
    appVersion: safe(typeof __AURA_APP_VERSION__ !== 'undefined' ? __AURA_APP_VERSION__ : null, '0.0.0'),
    manifestVersion: String((manifest as { manifestVersion?: number }).manifestVersion ?? 'unknown'),
  };
}

/** Stamps the fingerprint onto <html> so a deployed host can be identified. */
export function stampBuildFingerprint(): BuildFingerprint {
  const fp = getBuildFingerprint();
  if (typeof document !== 'undefined') {
    const el = document.documentElement;
    el.setAttribute('data-aura-build-id', fp.buildId);
    el.setAttribute('data-aura-commit-sha', fp.commitSha);
    el.setAttribute('data-aura-build-timestamp', fp.buildTimestamp);
    el.setAttribute('data-aura-app-version', fp.appVersion);
    el.setAttribute('data-aura-manifest-version', fp.manifestVersion);
  }
  return fp;
}
