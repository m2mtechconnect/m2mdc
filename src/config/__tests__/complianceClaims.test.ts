import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PLATFORM_COMPLIANCE_CLAIMS,
  assertNoProhibitedPlatformClaim,
  publishablePlatformClaims,
  getPlatformComplianceClaim,
} from '@/config/complianceClaims';

/** Product chrome that speaks for AURA itself, not for a modelled facility. */
const PLATFORM_CHROME_FILES = [
  'src/components/auth/SecurityBadge.tsx',
  'src/components/auth/AuthLayout.tsx',
  'src/ux/UX_STRINGS.ts',
];

describe('platform compliance claim boundary', () => {
  it('publishes no certification claim without certified status', () => {
    for (const claim of publishablePlatformClaims()) {
      expect(claim.status).not.toBe('not-established');
      expect(claim.evidence.length).toBeGreaterThan(0);
    }
  });

  it('keeps uncertified frameworks unpublishable', () => {
    for (const id of ['soc2', 'iso27001', 'pipeda']) {
      const claim = getPlatformComplianceClaim(id);
      expect(claim?.status).toBe('not-established');
      expect(claim?.publicStatement).toBe('');
    }
  });

  it('every claim record carries evidence', () => {
    for (const claim of PLATFORM_COMPLIANCE_CLAIMS) {
      expect(claim.evidence.trim().length).toBeGreaterThan(0);
    }
  });

  it('detects prohibited phrasing', () => {
    expect(assertNoProhibitedPlatformClaim('SOC 2 Compliant')).not.toHaveLength(0);
    expect(assertNoProhibitedPlatformClaim('Encrypted in transit')).toHaveLength(0);
  });

  it('platform chrome carries no uncertified claim copy', () => {
    for (const file of PLATFORM_CHROME_FILES) {
      let source: string;
      try {
        source = readFileSync(join(process.cwd(), file), 'utf8');
      } catch {
        continue;
      }
      // Ignore the doc comment in the badge that names the excluded claims.
      const withoutComments = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect({ file, hits: assertNoProhibitedPlatformClaim(withoutComments) }).toEqual({
        file,
        hits: [],
      });
    }
  });
});
