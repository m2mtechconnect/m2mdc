/**
 * Production-equivalent delivery verification.
 *
 * The benchmark is only valid when the derivative actually arrived over the
 * published CDN/storage delivery path, with the exact published bytes. If a
 * development-host copy or a local file served the geometry, the run is
 * marked invalid.
 */

import type { AssetExpectation } from './spec';

export interface DeliveryReport {
  requestedUrl: string;
  resolvedUrl: string;
  host: string;
  status: number | null;
  ok: boolean;
  mimeType: string | null;
  contentLength: number | null;
  downloadedBytes: number | null;
  sha256: string | null;
  checksumMatches: boolean;
  viaCdnPath: boolean;
  developmentHostCopy: boolean;
  transferMs: number | null;
  valid: boolean;
  findings: string[];
}

/** Published CDN/storage delivery prefix for approved derivatives. */
export const CDN_PATH_PREFIX = '/__l5e/assets-v1/';

const DEV_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

export function isDevelopmentHost(hostname: string): boolean {
  return DEV_HOSTS.includes(hostname) || hostname.endsWith('.local');
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyDelivery(expected: AssetExpectation): Promise<DeliveryReport> {
  const findings: string[] = [];
  const resolved = new URL(expected.glbUrl, window.location.origin);
  const developmentHostCopy = isDevelopmentHost(resolved.hostname);
  const viaCdnPath = resolved.pathname.startsWith(CDN_PATH_PREFIX);

  const report: DeliveryReport = {
    requestedUrl: expected.glbUrl,
    resolvedUrl: resolved.toString(),
    host: resolved.host,
    status: null,
    ok: false,
    mimeType: null,
    contentLength: null,
    downloadedBytes: null,
    sha256: null,
    checksumMatches: false,
    viaCdnPath,
    developmentHostCopy,
    transferMs: null,
    valid: false,
    findings,
  };

  if (!viaCdnPath) {
    findings.push(
      `Derivative is not served from the published delivery path (${CDN_PATH_PREFIX}). Run marked invalid.`,
    );
  }
  if (developmentHostCopy) {
    findings.push(
      'Derivative resolved against a development host. A production-equivalent host is required; run marked invalid.',
    );
  }

  const startedAt = performance.now();
  try {
    const response = await fetch(resolved.toString(), { cache: 'no-store', credentials: 'include' });
    report.status = response.status;
    report.ok = response.ok;
    report.mimeType = response.headers.get('content-type');
    const declaredLength = response.headers.get('content-length');
    report.contentLength = declaredLength ? Number(declaredLength) : null;

    const bytes = await response.arrayBuffer();
    report.transferMs = Math.round(performance.now() - startedAt);
    report.downloadedBytes = bytes.byteLength;
    const digest = await sha256Hex(bytes);
    report.sha256 = digest ? `sha256:${digest}` : null;
    report.checksumMatches = report.sha256 === expected.checksum;

    if (response.status !== 200) findings.push(`HTTP status ${response.status}, expected 200.`);
    if (!(report.mimeType ?? '').includes(expected.mimeType)) {
      findings.push(`MIME type "${report.mimeType ?? 'none'}", expected ${expected.mimeType}.`);
    }
    if (report.contentLength !== null && report.contentLength !== expected.derivativeBytes) {
      findings.push(
        `Content-Length ${report.contentLength} does not match the published derivative (${expected.derivativeBytes}).`,
      );
    }
    if (report.downloadedBytes !== expected.derivativeBytes) {
      findings.push(
        `Downloaded ${report.downloadedBytes} bytes, expected ${expected.derivativeBytes}.`,
      );
    }
    if (!report.sha256) {
      findings.push('SHA-256 unavailable: Web Crypto is not exposed on this origin (requires HTTPS).');
    } else if (!report.checksumMatches) {
      findings.push(`Downloaded bytes hash ${report.sha256}, expected ${expected.checksum}.`);
    }
  } catch (error) {
    findings.push(`Delivery request failed: ${(error as Error).message}`);
  }

  report.valid =
    report.status === 200 &&
    report.checksumMatches &&
    report.viaCdnPath &&
    !report.developmentHostCopy &&
    report.downloadedBytes === expected.derivativeBytes;

  return report;
}