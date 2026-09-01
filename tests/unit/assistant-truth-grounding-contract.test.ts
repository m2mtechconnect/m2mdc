/**
 * AURA Assistant truth-grounding contract.
 *
 * Regression coverage for the production defect where the assistant, asked
 * on /dashboard "Is this facility live, and is the current visualisation a
 * validated OpenUSD stage? Cite the evidence shown in AURA.", failed to
 * answer, gave no citations, and produced generic template/agent
 * recommendations that contradicted the page truth.
 *
 * The shared runtime under test is pure TypeScript used verbatim by the
 * copilot-stream edge function.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ALLOWED_VIEWPORT_DISCLOSURES,
  ALLOWED_VIEWPORT_LIMITATIONS,
  ALLOWED_VIEWPORT_RENDERERS,
  GROUNDED_FALLBACK_NEXT_STEPS,
  SERVER_CAPABILITY_BASELINE,
  buildEvidencePreamble,
  buildFacilityEvidenceEnvelope,
  chunkForStream,
  classifyTruthQuery,
  gateStructuredResponse,
  renderTruthAnswer,
} from '../../supabase/functions/_shared/assistantTruth';
import { VIEWPORT_SURFACES } from '@/workspace/viewportRegistry';
import { evaluateRestrictedClaim, RESTRICTED_CLAIM_CATEGORIES } from '@/supervisor/knowledge/evidenceGuardrails';

const PRODUCTION_PROMPT =
  'Is this facility live, and is the current visualisation a validated OpenUSD stage? Cite the evidence shown in AURA.';

const CITATION_PATTERN = /\[[^\][]+ · [^\][]+\]/g;

/** The context the dashboard client now sends (facility truth block attached). */
const dashboardContext = {
  activePage: 'dashboard',
  facilityTruth: {
    schema: 'aura.facility-truth.v1',
    mode: 'SIMULATED',
    inputClassification: 'Synthetic inputs',
    source: 'AURA deterministic simulation',
    run: null,
    viewport: {
      id: 'command-centre-plan-card',
      renderer: 'svg-2d',
      disclosure: 'Procedural 2D floor plan of the modelled design',
      limitation: 'Not a validated OpenUSD stage',
    },
    capabilities: [],
    readiness: { productionVerdict: 'NO-GO' },
    capturedAt: '2026-09-01T06:00:00.000Z',
  },
};

describe('truth-question classification', () => {
  it('classifies the exact production prompt as a truth question', () => {
    const result = classifyTruthQuery(PRODUCTION_PROMPT);
    expect(result.isTruthQuery).toBe(true);
    expect(result.topics).toContain('liveStatus');
    expect(result.topics).toContain('visualization');
  });

  it('classifies deployment/readiness status questions as truth questions', () => {
    const result = classifyTruthQuery('Is this deployed to production, and is it ready for go-live?');
    expect(result.isTruthQuery).toBe(true);
    expect(result.topics).toContain('readiness');
  });

  it('classifies connected/healthy/verified questions as truth questions', () => {
    const result = classifyTruthQuery('Is live telemetry connected, healthy, and verified?');
    expect(result.isTruthQuery).toBe(true);
    expect(result.topics).toContain('connectionHealth');
  });

  it('leaves how-to questions on the generic path', () => {
    expect(classifyTruthQuery('How do I deploy an agent?').isTruthQuery).toBe(false);
    expect(classifyTruthQuery('How can I connect Slack to a workflow?').isTruthQuery).toBe(false);
  });
});

describe('production prompt - deterministic grounded answer', () => {
  const envelope = buildFacilityEvidenceEnvelope(dashboardContext);
  const answer = renderTruthAnswer(PRODUCTION_PROMPT, envelope);

  it('states the facility is not live and simulated/synthetic', () => {
    expect(answer.markdown).toMatch(/not live/i);
    expect(answer.markdown).toMatch(/Simulated mode/i);
    expect(answer.markdown).toMatch(/synthetic/i);
  });

  it('states live telemetry is not connected', () => {
    expect(answer.markdown).toMatch(/telemetry is not connected/i);
  });

  it('states the visualisation is procedural 2D and not a validated OpenUSD stage', () => {
    expect(answer.markdown).toMatch(/procedural 2D floor plan/i);
    expect(answer.markdown).toMatch(/not a validated OpenUSD stage/i);
  });

  it('states no simulation run has been recorded', () => {
    expect(answer.markdown).toMatch(/No simulation run has been recorded/i);
  });

  it('carries at least two visible AURA evidence citations', () => {
    const citations = answer.markdown.match(CITATION_PATTERN) ?? [];
    expect(citations.length).toBeGreaterThanOrEqual(2);
    expect(citations.join(' ')).toMatch(/Operating mode: SIMULATED/);
    expect(citations.join(' ')).toMatch(/Not a validated OpenUSD stage/);
  });

  it('preserves the modelled-facility boundary statement', () => {
    expect(answer.markdown).toMatch(/no live facility feed/i);
  });

  it('emits no capability actions and only evidence-grounded next steps', () => {
    const gated = gateStructuredResponse(answer.structured, envelope, dashboardContext);
    expect(gated.actions).toHaveLength(0);
    expect(gated.nextSteps).toEqual([...GROUNDED_FALLBACK_NEXT_STEPS]);
    const all = JSON.stringify(gated);
    expect(all).not.toMatch(/market\s*place/i);
    expect(all).not.toMatch(/\btemplates?\b/i);
    expect(all).not.toMatch(/real[\s-]?time/i);
  });
});

describe('missing evidence - abstention, never inference', () => {
  it('abstains on visualisation and run provenance when the context is empty', () => {
    const envelope = buildFacilityEvidenceEnvelope({});
    const answer = renderTruthAnswer(PRODUCTION_PROMPT, envelope);
    expect(answer.markdown).toMatch(/not verified/i);
    expect(answer.markdown).toMatch(/no grounding/i);
    // The server-known negative facts still hold without client evidence.
    expect(answer.markdown).toMatch(/no validated OpenUSD stage is mounted/i);
  });

  it('abstains on freshness when no timestamp is present', () => {
    const envelope = buildFacilityEvidenceEnvelope({});
    const answer = renderTruthAnswer('Is the data on this page up to date?', envelope);
    expect(answer.markdown).toMatch(/not verified/i);
    expect(answer.markdown).toMatch(/no grounding/i);
  });

  it('rejects a viewport claim that does not match the registry mirror', () => {
    const envelope = buildFacilityEvidenceEnvelope({
      facilityTruth: {
        mode: 'SIMULATED',
        run: null,
        viewport: {
          id: 'spoofed',
          renderer: 'three-webgl',
          disclosure: 'Validated OpenUSD stage rendered live',
          limitation: null,
        },
      },
    });
    expect(envelope.visualization.grounded).toBe(false);
    expect(envelope.rejectedClientClaims.some((c) => c.includes('viewport'))).toBe(true);
  });
});

describe('truth semantics ladder and downgrade-only envelope', () => {
  it('never upgrades mode or capabilities from client claims', () => {
    const envelope = buildFacilityEvidenceEnvelope({
      facilityTruth: {
        mode: 'LIVE',
        run: null,
        capabilities: [
          { key: 'liveTelemetry', enabled: true },
          { key: 'openUsdStage', enabled: true },
        ],
      },
    });
    expect(envelope.mode).toBe('SIMULATED');
    expect(envelope.telemetry.connected).toBe(false);
    expect(envelope.telemetry.verified).toBe(false);
    expect(envelope.visualization.validatedOpenUsdStage).toBe(false);
    expect(envelope.rejectedClientClaims.length).toBeGreaterThanOrEqual(3);
  });

  it('answers connected/healthy/verified queries with ladder distinctions', () => {
    const envelope = buildFacilityEvidenceEnvelope(dashboardContext);
    const answer = renderTruthAnswer('Is live telemetry connected, healthy, and verified?', envelope);
    expect(answer.markdown).toMatch(/configured is not connected/i);
    expect(answer.markdown).toMatch(/connected is not healthy/i);
    expect(answer.markdown).toMatch(/healthy is not verified/i);
    expect(answer.markdown).toMatch(/simulated is not measured/i);
  });

  it('answers deployment/readiness queries with No-Go and restricted-claim abstention', () => {
    const envelope = buildFacilityEvidenceEnvelope(dashboardContext);
    const answer = renderTruthAnswer('Is this deployed to production, and is it ready for go-live?', envelope);
    expect(answer.markdown).toMatch(/No-Go/);
    expect(answer.markdown).toMatch(/not verified/i);
    const citations = answer.markdown.match(CITATION_PATTERN) ?? [];
    expect(citations.join(' ')).toMatch(/Production verdict: NO-GO/);
  });

  it('keeps the server baseline fail-closed for every remote capability', () => {
    for (const cap of SERVER_CAPABILITY_BASELINE) {
      if (cap.key === 'simulatedMode') {
        expect(cap.available).toBe(true);
        continue;
      }
      expect(cap.available).toBe(false);
      expect(cap.verified).toBe(false);
      expect(cap.state).toBe('unavailable');
      expect(cap.requirement.length).toBeGreaterThan(0);
    }
  });
});

describe('capability-aware structured-response gate', () => {
  const envelope = buildFacilityEvidenceEnvelope(dashboardContext);

  it('removes template/marketplace, real-time and unavailable-capability suggestions', () => {
    const gated = gateStructuredResponse(
      {
        actions: [
          { label: 'Browse Templates', handler: '/templates', icon: 'external' },
          { label: 'Run Simulation', handler: 'simulate', icon: 'play' },
          { label: 'Deploy to Production', handler: 'deploy', icon: 'rocket' },
        ],
        insights: ['Browse the template marketplace for ideas.'],
        nextSteps: [
          'Explore available templates',
          'Create or configure an agent',
          'Set up workflows and integrations',
          'Monitor real-time KPIs in the dashboard',
        ],
        followUps: ['Are there templates I can start from?'],
      },
      envelope,
      { activePage: 'dashboard' },
    );
    expect(gated.actions).toHaveLength(0);
    expect(gated.insights).toHaveLength(0);
    expect(gated.followUps).toHaveLength(0);
    expect(gated.nextSteps).toEqual([...GROUNDED_FALLBACK_NEXT_STEPS]);
    const all = JSON.stringify(gated);
    expect(all).not.toMatch(/\btemplates?\b/i);
    expect(all).not.toMatch(/market\s*place/i);
    expect(all).not.toMatch(/real[\s-]?time/i);
  });

  it('keeps simulation suggestions where deterministic simulation applies', () => {
    const gated = gateStructuredResponse(
      {
        actions: [
          { label: 'Run Cooling Failure', handler: 'cmd:runSimulation:cooling_failure_hot_aisle', icon: 'play' },
          { label: 'Apply 3 High Priority', handler: 'cmd:applyHighPriorityRecs', icon: 'zap' },
        ],
        insights: [],
        nextSteps: ['Run simulations to test operational resilience', 'Deploy the fix to production'],
        followUps: ['Run cooling failure simulation'],
      },
      envelope,
      { isDataCentreDomain: true, activePage: 'data_centre_twin' },
    );
    expect(gated.actions.map((a) => a.label)).toEqual(['Run Cooling Failure']);
    expect(gated.nextSteps).toEqual(['Run simulations to test operational resilience']);
    expect(gated.followUps).toEqual(['Run cooling failure simulation']);
  });

  it('preserves negative truth statements in insights', () => {
    const gated = gateStructuredResponse(
      { insights: ['Production readiness: No-Go; deployment state not verified in this context.'] },
      envelope,
      { activePage: 'dashboard' },
    );
    expect(gated.insights).toHaveLength(1);
  });
});

describe('generic model path guardrails', () => {
  it('the evidence preamble forbids live/measured/real-time and OpenUSD claims', () => {
    const preamble = buildEvidencePreamble(buildFacilityEvidenceEnvelope(dashboardContext));
    expect(preamble).toMatch(/Never claim the facility, data, telemetry or KPIs are live/);
    expect(preamble).toMatch(/Never claim OpenUSD, SimReady/);
    expect(preamble).toMatch(/not verified.*no grounding/i);
    expect(preamble).toMatch(/retired/);
  });

  it('chunkForStream is lossless so the streaming UI contract is preserved', () => {
    const text = renderTruthAnswer(PRODUCTION_PROMPT, buildFacilityEvidenceEnvelope(dashboardContext)).markdown;
    expect(chunkForStream(text).join('')).toBe(text);
    expect(chunkForStream(text).length).toBeGreaterThan(1);
  });
});

describe('viewport registry mirror stays in sync', () => {
  it('every registry disclosure, limitation and renderer is server-known', () => {
    for (const surface of VIEWPORT_SURFACES) {
      expect(ALLOWED_VIEWPORT_DISCLOSURES).toContain(surface.disclosure);
      expect(ALLOWED_VIEWPORT_RENDERERS).toContain(surface.renderer);
      if (surface.limitation) {
        expect(ALLOWED_VIEWPORT_LIMITATIONS).toContain(surface.limitation);
      }
    }
  });
});

describe('edge function and client wiring (static contract)', () => {
  const edgeSource = readFileSync(
    path.resolve(__dirname, '../../supabase/functions/copilot-stream/index.ts'),
    'utf8',
  );
  const clientSource = readFileSync(
    path.resolve(__dirname, '../../src/lib/copilot/streaming.ts'),
    'utf8',
  );

  it('copilot-stream imports and applies the shared truth runtime', () => {
    expect(edgeSource).toContain('../_shared/assistantTruth.ts');
    expect(edgeSource).toContain('classifyTruthQuery(');
    expect(edgeSource).toContain('renderTruthAnswer(');
    expect(edgeSource).toContain('buildEvidencePreamble(');
    // Both structured emissions (truth path and model path) are gated.
    expect(edgeSource.split('gateStructuredResponse(').length - 1).toBeGreaterThanOrEqual(2);
  });

  it('the retired generics are gone from the edge function source', () => {
    expect(edgeSource).not.toContain('Explore available templates');
    expect(edgeSource).not.toContain('Browse Templates');
    expect(edgeSource).not.toContain('Create or configure an agent');
    expect(edgeSource).not.toContain('Monitor real-time KPIs');
    expect(edgeSource).not.toMatch(/market\s*place/i);
  });

  it('both client context paths attach the facility truth block', () => {
    expect(clientSource.split('buildFacilityTruthContext(').length - 1).toBeGreaterThanOrEqual(2);
  });
});

describe('evidence guardrails remain fail-closed', () => {
  it('blocks every restricted claim category without evidence', () => {
    for (const category of RESTRICTED_CLAIM_CATEGORIES) {
      const evaluation = evaluateRestrictedClaim({
        category,
        statement: 'This capability is active in production.',
        evidence: [],
      });
      expect(evaluation.verdict).toBe('blocked-unevidenced');
      expect(evaluation.supportingArtifactRefs).toHaveLength(0);
    }
  });

  it('blocks claims supported only by the wrong evidence class', () => {
    const evaluation = evaluateRestrictedClaim({
      category: 'production-readiness',
      statement: 'AURA is production ready.',
      evidence: [
        {
          artifactRef: 'docs/evidence/some-test-report.md',
          kind: 'test-report',
          sha256: null,
          performedAt: '2026-09-01T00:00:00Z',
        },
      ],
    });
    expect(evaluation.verdict).toBe('blocked-wrong-evidence-kind');
  });
});
