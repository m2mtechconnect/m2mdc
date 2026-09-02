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
  CANONICAL_VIEWPORT_SURFACES,
  GROUNDED_FALLBACK_NEXT_STEPS,
  SERVER_CAPABILITY_BASELINE,
  buildEvidencePreamble,
  buildFacilityEvidenceEnvelope,
  chunkForStream,
  classifyTruthQuery,
  extractCandidateRunId,
  gateStructuredResponse,
  renderTruthAnswer,
  type VerifiedRunRecord,
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

  it('states the page shows no run without claiming database truth', () => {
    expect(answer.markdown).toMatch(/current AURA page shows no run/i);
    expect(answer.markdown).toMatch(/not proof/i);
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

describe('viewport canonical allowlist stays in exact sync with the registry', () => {
  it('mirrors every registry surface as an exact (id, renderer, disclosure, limitation) tuple', () => {
    expect(CANONICAL_VIEWPORT_SURFACES).toHaveLength(VIEWPORT_SURFACES.length);
    for (const surface of VIEWPORT_SURFACES) {
      const canonical = CANONICAL_VIEWPORT_SURFACES.find((c) => c.id === surface.id);
      expect(canonical, `missing canonical record for ${surface.id}`).toBeDefined();
      expect(canonical).toEqual({
        id: surface.id,
        renderer: surface.renderer,
        disclosure: surface.disclosure,
        limitation: surface.limitation ?? null,
      });
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

  it('verifies the candidate run id through the RLS-scoped client before the envelope is built', () => {
    expect(edgeSource).toContain('extractCandidateRunId(');
    const lookupIndex = edgeSource.indexOf(".from('simulation_runs')");
    const envelopeIndex = edgeSource.indexOf('buildFacilityEvidenceEnvelope(');
    expect(lookupIndex).toBeGreaterThan(-1);
    expect(envelopeIndex).toBeGreaterThan(-1);
    expect(lookupIndex).toBeLessThan(envelopeIndex);
    // The verified record is what grounds the envelope's run provenance.
    expect(edgeSource).toContain('buildFacilityEvidenceEnvelope(context ?? {}, verifiedRun)');
  });

  it('run lookup selects only minimal provenance fields and never uses the service role', () => {
    expect(edgeSource).toContain("select('id, status, started_at, finished_at')");
    // No tenant/user columns leave the database row into assistant context.
    expect(edgeSource).not.toMatch(/select\([^)]*(user_id|tenant_id)/);
    expect(edgeSource).not.toContain('SERVICE_ROLE');
    // The lookup runs on the caller-scoped client (anon key + caller's
    // Authorization header), so RLS decides row visibility.
    expect(edgeSource).toContain("Deno.env.get('SUPABASE_ANON_KEY')");
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

describe('viewport evidence - exact canonical tuple allowlist', () => {
  it('rejects a spoofed surface id even when every string is individually canonical', () => {
    const envelope = buildFacilityEvidenceEnvelope({
      facilityTruth: {
        run: null,
        viewport: {
          id: 'command-centre-plan-card-copy',
          renderer: 'svg-2d',
          disclosure: 'Procedural 2D floor plan of the modelled design',
          limitation: 'Not a validated OpenUSD stage',
        },
      },
    });
    expect(envelope.visualization.grounded).toBe(false);
    expect(envelope.visualization.surfaceId).toBeNull();
    expect(envelope.rejectedClientClaims).toContain('viewport evidence rejected: unknown surface id');
    const answer = renderTruthAnswer(PRODUCTION_PROMPT, envelope);
    expect(answer.markdown).toMatch(/not verified/i);
    expect(answer.markdown).toMatch(/no grounding/i);
  });

  it('rejects a cross-surface tuple carried under a known id', () => {
    const envelope = buildFacilityEvidenceEnvelope({
      facilityTruth: {
        run: null,
        viewport: {
          // Real id, but the renderer/disclosure tuple of a different surface.
          id: 'command-centre-plan-card',
          renderer: 'three-webgl',
          disclosure:
            'Procedural 3D preview, except one canary rack rendered from a validated USD-derived GLB',
          limitation: null,
        },
      },
    });
    expect(envelope.visualization.grounded).toBe(false);
    expect(envelope.visualization.surfaceId).toBeNull();
    expect(
      envelope.rejectedClientClaims.some((c) =>
        c.includes('tuple does not match the canonical record for command-centre-plan-card'),
      ),
    ).toBe(true);
    const answer = renderTruthAnswer(PRODUCTION_PROMPT, envelope);
    expect(answer.markdown).toMatch(/not verified/i);
    expect(answer.markdown).toMatch(/no grounding/i);
  });

  it('accepts the exact canonical tuple and cites the canonical surface id', () => {
    const envelope = buildFacilityEvidenceEnvelope(dashboardContext);
    expect(envelope.visualization.grounded).toBe(true);
    expect(envelope.visualization.surfaceId).toBe('command-centre-plan-card');
    expect(
      envelope.visualization.citations.some(
        (c) => c.surface === 'Viewport registry' && c.value === 'command-centre-plan-card',
      ),
    ).toBe(true);
    const answer = renderTruthAnswer(PRODUCTION_PROMPT, envelope);
    expect(answer.markdown).toContain('command-centre-plan-card');
  });
});

describe('run provenance - server verification is the only path to recorded', () => {
  const RUN_ID = '3f8b0d3e-4c1a-4f4e-9a5d-6b7c8d9e0f1a';
  const RUN_PROMPT = 'What simulation run produced these results? Cite the provenance.';
  const verifiedRecord: VerifiedRunRecord = {
    id: RUN_ID,
    status: 'completed',
    startedAt: '2026-09-01T05:00:00.000Z',
    finishedAt: '2026-09-01T05:05:00.000Z',
  };

  it('never records a run from a client-supplied facilityTruth id alone', () => {
    const envelope = buildFacilityEvidenceEnvelope({
      facilityTruth: { run: { id: RUN_ID, status: 'completed' } },
    });
    expect(envelope.run.grounded).toBe(false);
    expect(envelope.run.recorded).toBe(false);
    expect(envelope.run.verified).toBe(false);
    expect(envelope.run.id).toBeNull();
    expect(envelope.rejectedClientClaims).toContain(
      'run provenance rejected: client-supplied run id is not server-verified',
    );
    const answer = renderTruthAnswer(RUN_PROMPT, envelope);
    expect(answer.markdown).toMatch(/not verified/i);
    expect(answer.markdown).toMatch(/no grounding/i);
    expect(answer.markdown).not.toContain(RUN_ID);
  });

  it('never records a run from the legacy simulationRun context alone', () => {
    const envelope = buildFacilityEvidenceEnvelope({
      simulationRun: { runId: RUN_ID, status: 'completed', startedAt: '2026-09-01T05:00:00.000Z' },
    });
    expect(envelope.run.recorded).toBe(false);
    expect(envelope.run.id).toBeNull();
    expect(envelope.rejectedClientClaims.some((c) => c.includes('not server-verified'))).toBe(true);
  });

  it('records and cites a run only from the server-verified record', () => {
    const envelope = buildFacilityEvidenceEnvelope(
      { facilityTruth: { run: { id: RUN_ID } } },
      verifiedRecord,
    );
    expect(envelope.run.grounded).toBe(true);
    expect(envelope.run.recorded).toBe(true);
    expect(envelope.run.verified).toBe(true);
    expect(envelope.run.id).toBe(RUN_ID);
    expect(envelope.run.citation.value).toBe(RUN_ID);
    expect(envelope.run.persistence).toBe('Server-verified simulation run record');
    const answer = renderTruthAnswer(RUN_PROMPT, envelope);
    expect(answer.markdown).toMatch(/server-verified simulation run/i);
    expect(answer.markdown).toContain(RUN_ID);
  });

  it('fails closed when the verified record does not match the context id', () => {
    const envelope = buildFacilityEvidenceEnvelope(
      { facilityTruth: { run: { id: '00000000-0000-4000-8000-00000000abcd' } } },
      verifiedRecord,
    );
    expect(envelope.run.recorded).toBe(false);
    expect(envelope.run.verified).toBe(false);
    expect(envelope.run.id).toBeNull();
    expect(
      envelope.rejectedClientClaims.some((c) =>
        c.includes('verified record does not match the context run id'),
      ),
    ).toBe(true);
  });

  it('treats malformed candidate ids as no locator at all', () => {
    expect(extractCandidateRunId({ facilityTruth: { run: { id: 'not-a-uuid' } } })).toBeNull();
    expect(
      extractCandidateRunId({ simulationRun: { runId: '1; DROP TABLE simulation_runs' } }),
    ).toBeNull();
    expect(extractCandidateRunId({ facilityTruth: { run: { id: RUN_ID } } })).toBe(RUN_ID);
    expect(extractCandidateRunId({ simulationRun: { runId: RUN_ID.toUpperCase() } })).toBe(RUN_ID);
    expect(extractCandidateRunId({})).toBeNull();
    expect(extractCandidateRunId(null)).toBeNull();
  });

  it('describes an explicit run:null as the page showing no run, never database truth', () => {
    const envelope = buildFacilityEvidenceEnvelope(dashboardContext);
    expect(envelope.run.grounded).toBe(true);
    expect(envelope.run.recorded).toBe(false);
    expect(envelope.run.verified).toBe(false);
    const answer = renderTruthAnswer('Is there a simulation run recorded for this page?', envelope);
    expect(answer.markdown).toMatch(/current AURA page shows no run/i);
    expect(answer.markdown).toMatch(/not proof/i);
    expect(answer.markdown).not.toMatch(/no simulation run has been recorded/i);
  });

  it('abstains entirely when no run evidence of any kind is present', () => {
    const envelope = buildFacilityEvidenceEnvelope({});
    expect(envelope.run.grounded).toBe(false);
    expect(envelope.run.recorded).toBe(false);
    const answer = renderTruthAnswer(RUN_PROMPT, envelope);
    expect(answer.markdown).toMatch(/not verified/i);
    expect(answer.markdown).toMatch(/no grounding/i);
  });

  it('keeps the evidence preamble truthful for each run state', () => {
    const verified = buildEvidencePreamble(
      buildFacilityEvidenceEnvelope({ facilityTruth: { run: { id: RUN_ID } } }, verifiedRecord),
    );
    expect(verified).toContain(`Server-verified simulation run on record: ${RUN_ID}.`);
    const pageNull = buildEvidencePreamble(buildFacilityEvidenceEnvelope(dashboardContext));
    expect(pageNull).toContain('not proof that no database run exists');
    const spoofed = buildEvidencePreamble(
      buildFacilityEvidenceEnvelope({ facilityTruth: { run: { id: RUN_ID } } }),
    );
    expect(spoofed).toContain('No server-verified simulation run is attached to this context.');
    expect(spoofed).not.toContain(RUN_ID);
  });
});
