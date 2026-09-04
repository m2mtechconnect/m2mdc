import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const twinPage = readFileSync('src/pages/DataCentreTwin.tsx', 'utf8');
const sovereigntyView = readFileSync(
  'src/components/data-centre-twin/domains/SovereigntyDomainView.tsx',
  'utf8',
);
const sovereigntyAnalytics = readFileSync(
  'src/components/telemetry/SovereigntyAnalyticsTab.tsx',
  'utf8',
);
const groundedSummary = readFileSync(
  'supabase/functions/grounded-summary/index.ts',
  'utf8',
);
const queryAnswer = readFileSync('supabase/functions/query-answer/index.ts', 'utf8');
const aocSimulateTest = readFileSync('supabase/functions/aoc-simulate-test/index.ts', 'utf8');
const releaseContract = readFileSync('scripts/aura-release-contract.mjs', 'utf8');

describe('AURA truth-boundary regressions', () => {
  it('does not spread the Montreal fixture into authenticated twins', () => {
    expect(twinPage).toContain('OperationalDataUnavailable twin={twin}');
    expect(twinPage).not.toContain('enhancedFacility');
  });

  it('fails closed when sovereignty evidence is unavailable', () => {
    expect(sovereigntyView).toContain('if (!isAssessmentAvailable)');
    expect(sovereigntyView).toContain('Scores, compliance status');
    expect(sovereigntyAnalytics).toContain('sovereignty-analytics-unavailable');
  });

  it('binds grounded summary writes to the authenticated page owner', () => {
    expect(groundedSummary).toContain('requireCaller(req)');
    expect(groundedSummary).toContain(".from('captured_pages')");
    expect(groundedSummary).toContain('page.user_id !== caller.userId');
  });

  it('derives search-history ownership from the verified caller', () => {
    expect(queryAnswer).toContain('requireCaller(req)');
    expect(queryAnswer).toContain('user_id: caller.userId');
    expect(queryAnswer).toContain('.or(`user_id.eq.${caller.userId},user_id.is.null`)');
    expect(queryAnswer).not.toContain('const { query, userId }');
  });

  it('keeps persisted AOC simulation outcomes deterministic', () => {
    expect(aocSimulateTest).toContain('function stableFraction');
    expect(aocSimulateTest).toContain('const outcomeSeed = `${agentId}|${testQuery}|${scenarioId ?? \'\'}`');
    expect(aocSimulateTest).not.toContain('Math.random()');
  });

  it('preserves structured release diagnostics when qualification throws', () => {
    expect(releaseContract).toContain('let lastPayload = null');
    expect(releaseContract).toContain('lastPayload\n      ? { ...lastPayload, details }');
  });
});
