/**
 * AURA Assistant truth grounding (shared runtime).
 *
 * Server-owned, deterministic facility evidence envelope plus the truth
 * answering and structured-suggestion gating that every copilot-stream
 * response must pass through.
 *
 * Truth rules enforced here (mirroring the governed engineering-knowledge
 * contract in src/supervisor/knowledge/):
 *   - configured != connected, connected != healthy, healthy != verified;
 *   - simulated != measured; missing evidence != available;
 *   - the server baseline is authoritative: client context can only DOWNGRADE
 *     a claim, never upgrade one. Prose is never accepted as proof - only
 *     structured fields whose values match server-known evidence labels.
 *   - When evidence is missing the assistant abstains ("not verified" /
 *     "no grounding") instead of inferring.
 *
 * This module is pure TypeScript with no Deno, DOM or network dependencies so
 * the same code runs in the edge function and under vitest.
 */

/* ------------------------------------------------------------------ *
 * Truth ladder
 * ------------------------------------------------------------------ */

export const TRUTH_LADDER = ['unavailable', 'configured', 'connected', 'healthy', 'verified'] as const;
export type TruthLadderState = (typeof TRUTH_LADDER)[number];

export const TRUTH_LADDER_NOTICE =
  'Configured is not connected, connected is not healthy, healthy is not verified, simulated is not measured, and missing evidence is never presented as available.';

/* ------------------------------------------------------------------ *
 * Server-owned capability baseline
 *
 * These facts mirror the fail-closed capability registry
 * (src/capabilities/registry.ts derived from src/config/dsxCapabilityRegistry.ts).
 * Upgrading any entry requires runtime evidence and a reviewed code change,
 * exactly like the registry itself. The client CANNOT upgrade these over the
 * wire; upgrade attempts are recorded and ignored.
 * ------------------------------------------------------------------ */

export interface ServerCapabilityFact {
  key: string;
  /** Provider-neutral, customer-visible label. */
  label: string;
  available: boolean;
  verified: boolean;
  state: TruthLadderState;
  /** Why the capability is unavailable. Empty when available. */
  requirement: string;
}

export const SERVER_CAPABILITY_BASELINE: readonly ServerCapabilityFact[] = [
  {
    key: 'simulatedMode',
    label: 'Deterministic simulation',
    available: true,
    verified: true,
    state: 'verified',
    requirement: '',
  },
  {
    key: 'replayedMode',
    label: 'Replayed datasets',
    available: false,
    verified: false,
    state: 'unavailable',
    requirement: 'A validated recorded dataset with provenance has not been supplied.',
  },
  {
    key: 'liveTelemetry',
    label: 'Live facility telemetry',
    available: false,
    verified: false,
    state: 'unavailable',
    requirement: 'No facility telemetry source has been connected or verified.',
  },
  {
    key: 'openUsdStage',
    label: 'Validated OpenUSD stage',
    available: false,
    verified: false,
    state: 'unavailable',
    requirement: 'No OpenUSD stage is mounted or resolved by an accelerated runtime.',
  },
  {
    key: 'simReadyAssets',
    label: 'SimReady-validated assets',
    available: false,
    verified: false,
    state: 'unavailable',
    requirement: 'No asset version and checksum carries a SimReady validation result.',
  },
  {
    key: 'acceleratedRuntime',
    label: 'Accelerated GPU runtime',
    available: false,
    verified: false,
    state: 'unavailable',
    requirement: 'No GPU runtime is connected or verified for this workspace.',
  },
  {
    key: 'calibratedSimulation',
    label: 'Calibrated simulation',
    available: false,
    verified: false,
    state: 'unavailable',
    requirement: 'No calibration dataset or validated model has been supplied.',
  },
];

/** Readiness baseline: production readiness is a restricted claim. */
export const SERVER_READINESS_BASELINE = {
  productionVerdict: 'NO-GO' as const,
  detail:
    'Production readiness requires a release-qualification artifact. None is present in this context, so the verdict stays No-Go.',
};

/* ------------------------------------------------------------------ *
 * Canonical viewport surface allowlist
 *
 * Exact mirror of src/workspace/viewportRegistry.ts, keyed by the canonical
 * surface id. A client-supplied viewport claim is accepted ONLY when its id
 * names a canonical record AND its renderer, disclosure and limitation match
 * that record exactly as a tuple. An unknown id, or a tuple mixed across
 * surfaces, is rejected as ungrounded - individually-valid strings are never
 * enough. tests/unit/assistant-truth-grounding-contract.test.ts keeps this
 * mirror in exact per-record sync with the registry.
 * ------------------------------------------------------------------ */

export const ALLOWED_VIEWPORT_RENDERERS = ['svg-2d', 'three-webgl'] as const;
export type AllowedViewportRenderer = (typeof ALLOWED_VIEWPORT_RENDERERS)[number];

export interface CanonicalViewportSurface {
  id: string;
  renderer: AllowedViewportRenderer;
  disclosure: string;
  limitation: string | null;
}

const GLB_CANARY_DISCLOSURE =
  'Procedural 3D preview, except one canary rack rendered from a validated USD-derived GLB';

export const CANONICAL_VIEWPORT_SURFACES: readonly CanonicalViewportSurface[] = [
  {
    id: 'workspace-model-viewport',
    renderer: 'three-webgl',
    disclosure: GLB_CANARY_DISCLOSURE,
    limitation: null,
  },
  {
    id: 'command-centre-plan-card',
    renderer: 'svg-2d',
    disclosure: 'Procedural 2D floor plan of the modelled design',
    limitation: 'Not a validated OpenUSD stage',
  },
  {
    id: 'overview-mini-preview',
    renderer: 'three-webgl',
    disclosure: GLB_CANARY_DISCLOSURE,
    limitation: null,
  },
  {
    id: 'twin-visualization-layout',
    renderer: 'three-webgl',
    disclosure: GLB_CANARY_DISCLOSURE,
    limitation: null,
  },
];

export function canonicalViewportSurface(id: string): CanonicalViewportSurface | null {
  return CANONICAL_VIEWPORT_SURFACES.find((s) => s.id === id) ?? null;
}

/* ------------------------------------------------------------------ *
 * Evidence envelope
 * ------------------------------------------------------------------ */

export interface EvidenceCitation {
  /** AURA surface the value is shown on (e.g. "Command Center"). */
  surface: string;
  /** Field or indicator name on that surface. */
  field: string;
  /** The evidence label exactly as displayed. */
  value: string;
}

export function formatCitation(c: EvidenceCitation): string {
  return `[${c.surface} · ${c.field}: ${c.value}]`;
}

export interface FacilityEvidenceEnvelope {
  /** Server-owned. The only mode the deployed platform can prove. */
  mode: 'SIMULATED';
  modeCitation: EvidenceCitation;
  inputClassification: 'Synthetic inputs';
  inputCitation: EvidenceCitation;
  source: 'AURA deterministic simulation';
  /** Context capture time, when the client supplied a parseable one. */
  freshness: { observedAt: string | null; grounded: boolean };
  run: {
    /**
     * True when structured run evidence exists: either a server-verified
     * record, or an explicit client "run: null" (the page shows no run).
     */
    grounded: boolean;
    /** True ONLY when a server-verified simulation_runs record exists. */
    recorded: boolean;
    /** True ONLY when the record came from the RLS-scoped server lookup. */
    verified: boolean;
    id: string | null;
    status: string | null;
    calculatedAt: string | null;
    persistence: string | null;
    citation: EvidenceCitation;
  };
  telemetry: {
    state: TruthLadderState;
    connected: boolean;
    healthy: boolean;
    verified: boolean;
    detail: string;
    citation: EvidenceCitation;
  };
  visualization: {
    /** True only when the claim matched one exact canonical surface tuple. */
    grounded: boolean;
    /** The accepted canonical surface id (registry locator), when grounded. */
    surfaceId: string | null;
    renderer: AllowedViewportRenderer | null;
    disclosure: string | null;
    limitation: string | null;
    /** Server-owned: no validated OpenUSD stage exists anywhere in AURA. */
    validatedOpenUsdStage: false;
    citations: EvidenceCitation[];
  };
  capabilities: readonly ServerCapabilityFact[];
  readiness: {
    productionVerdict: 'NO-GO';
    detail: string;
    citation: EvidenceCitation;
  };
  /** Audit trail of ignored client upgrade attempts. Never echoed as fact. */
  rejectedClientClaims: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown, max = 200): string | null {
  return typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null;
}

function isParseableIso(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

/* ------------------------------------------------------------------ *
 * Run provenance verification
 * ------------------------------------------------------------------ */

export const RUN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Minimal server-verified provenance for one simulation run. Produced ONLY by
 * the RLS-scoped lookup against public.simulation_runs in the edge function;
 * never constructed from client input. Deliberately excludes tenant and user
 * fields so nothing tenant-scoped can leak into an assistant answer.
 */
export interface VerifiedRunRecord {
  id: string;
  status: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

/**
 * Extract a candidate run id from the untrusted request context. The result
 * is a LOCATOR ONLY: it must be verified against public.simulation_runs
 * through the caller's RLS-scoped client before it can ground any claim.
 * Malformed ids fail closed to null.
 */
export function extractCandidateRunId(context: unknown): string | null {
  const ctx = isRecord(context) ? context : {};
  const ft = isRecord(ctx.facilityTruth) ? ctx.facilityTruth : null;
  const fromTruth = ft && isRecord(ft.run) ? asString(ft.run.id, 80) : null;
  const fromSimulation = isRecord(ctx.simulationRun) ? asString(ctx.simulationRun.runId, 80) : null;
  const candidate = fromTruth ?? fromSimulation;
  if (!candidate || !RUN_ID_PATTERN.test(candidate)) return null;
  return candidate.toLowerCase();
}

function isVerifiedRunRecord(v: unknown): v is VerifiedRunRecord {
  return isRecord(v) && typeof v.id === 'string' && RUN_ID_PATTERN.test(v.id);
}

/**
 * Build the server-owned evidence envelope from an untrusted request context.
 * Structured fields are read through exact server-known allowlists; free
 * prose is never treated as proof, and no client field can upgrade a server
 * baseline fact.
 *
 * `verifiedRun` is the ONLY path to `run.recorded === true`. It must be the
 * result of the RLS-scoped public.simulation_runs lookup performed by the
 * edge function; a client-supplied run id on its own never becomes
 * provenance.
 */
export function buildFacilityEvidenceEnvelope(
  context: unknown,
  verifiedRun: VerifiedRunRecord | null = null,
): FacilityEvidenceEnvelope {
  const ctx = isRecord(context) ? context : {};
  const ft = isRecord(ctx.facilityTruth) ? ctx.facilityTruth : null;
  const rejected: string[] = [];

  // Mode: server-owned. Record (but ignore) any upgrade attempt.
  if (ft && typeof ft.mode === 'string' && ft.mode !== 'SIMULATED') {
    rejected.push(`mode upgrade ignored: ${ft.mode.slice(0, 32)}`);
  }

  // Capabilities: server baseline is authoritative. Client "enabled" claims
  // that exceed the baseline are recorded and ignored.
  if (ft && Array.isArray(ft.capabilities)) {
    for (const raw of ft.capabilities) {
      if (!isRecord(raw)) continue;
      const key = asString(raw.key, 64);
      if (!key || raw.enabled !== true) continue;
      const baseline = SERVER_CAPABILITY_BASELINE.find((c) => c.key === key);
      if (!baseline || !baseline.available) {
        rejected.push(`capability upgrade ignored: ${key}`);
      }
    }
  }

  // Run provenance. `recorded` comes ONLY from a server-verified
  // simulation_runs record (RLS-scoped lookup in the edge function, passed in
  // as `verifiedRun`). A client-supplied run id is an untrusted locator and
  // fails closed to not-verified / no-grounding on its own. An explicit
  // client `run: null` grounds only the page-level statement that the current
  // AURA page shows no run - never proof about the database.
  let run: FacilityEvidenceEnvelope['run'];
  const candidateRunId = extractCandidateRunId(ctx);
  const clientClaimsRunId = Boolean(
    (ft && isRecord(ft.run) && asString(ft.run.id, 80)) ||
      (isRecord(ctx.simulationRun) && asString(ctx.simulationRun.runId, 80)),
  );
  const verifiedMatchesContext =
    isVerifiedRunRecord(verifiedRun) &&
    (!clientClaimsRunId ||
      (candidateRunId !== null && verifiedRun.id.toLowerCase() === candidateRunId));
  if (isVerifiedRunRecord(verifiedRun) && !verifiedMatchesContext) {
    rejected.push('run provenance rejected: verified record does not match the context run id');
  }
  if (isVerifiedRunRecord(verifiedRun) && verifiedMatchesContext) {
    run = {
      grounded: true,
      recorded: true,
      verified: true,
      id: verifiedRun.id,
      status: verifiedRun.status ?? null,
      calculatedAt: isParseableIso(verifiedRun.finishedAt)
        ? verifiedRun.finishedAt
        : isParseableIso(verifiedRun.startedAt)
          ? verifiedRun.startedAt
          : null,
      persistence: 'Server-verified simulation run record',
      citation: {
        surface: 'Run provenance',
        field: 'Server-verified simulation run',
        value: verifiedRun.id,
      },
    };
  } else if (clientClaimsRunId) {
    rejected.push('run provenance rejected: client-supplied run id is not server-verified');
    run = {
      grounded: false,
      recorded: false,
      verified: false,
      id: null,
      status: null,
      calculatedAt: null,
      persistence: null,
      citation: { surface: 'Run provenance', field: 'Simulation run', value: 'Not verified' },
    };
  } else if (ft && 'run' in ft && (ft.run === null || ft.run === undefined)) {
    run = {
      grounded: true,
      recorded: false,
      verified: false,
      id: null,
      status: null,
      calculatedAt: null,
      persistence: null,
      citation: {
        surface: 'Run provenance',
        field: 'Simulation run',
        value: 'None shown on this page',
      },
    };
  } else {
    run = {
      grounded: false,
      recorded: false,
      verified: false,
      id: null,
      status: null,
      calculatedAt: null,
      persistence: null,
      citation: { surface: 'Run provenance', field: 'Simulation run', value: 'No grounding' },
    };
  }

  // Visualization: accepted only when the claim names a canonical surface id
  // AND matches that record's exact (id, renderer, disclosure, limitation)
  // tuple. Unknown ids and cross-surface tuples are rejected, not softened,
  // and the grounded values are copied from the canonical record - never
  // echoed from the client strings.
  let visualization: FacilityEvidenceEnvelope['visualization'] = {
    grounded: false,
    surfaceId: null,
    renderer: null,
    disclosure: null,
    limitation: null,
    validatedOpenUsdStage: false,
    citations: [],
  };
  if (ft && isRecord(ft.viewport)) {
    const claimedId = asString(ft.viewport.id, 80);
    const canonical = claimedId ? canonicalViewportSurface(claimedId) : null;
    if (!canonical) {
      rejected.push('viewport evidence rejected: unknown surface id');
    } else {
      const renderer = asString(ft.viewport.renderer, 40);
      const disclosure = asString(ft.viewport.disclosure, 200);
      const limitation = asString(ft.viewport.limitation, 200);
      const tupleMatches =
        renderer === canonical.renderer &&
        disclosure === canonical.disclosure &&
        limitation === canonical.limitation;
      if (!tupleMatches) {
        rejected.push(
          `viewport evidence rejected: tuple does not match the canonical record for ${canonical.id}`,
        );
      } else {
        const citations: EvidenceCitation[] = [
          { surface: 'Viewport registry', field: 'Surface', value: canonical.id },
          { surface: 'Facility viewport', field: 'Disclosure', value: canonical.disclosure },
        ];
        if (canonical.limitation) {
          citations.push({
            surface: 'Facility viewport',
            field: 'Limitation',
            value: canonical.limitation,
          });
        }
        visualization = {
          grounded: true,
          surfaceId: canonical.id,
          renderer: canonical.renderer,
          disclosure: canonical.disclosure,
          limitation: canonical.limitation,
          validatedOpenUsdStage: false,
          citations,
        };
      }
    }
  }

  return {
    mode: 'SIMULATED',
    modeCitation: { surface: 'Command Center', field: 'Operating mode', value: 'SIMULATED' },
    inputClassification: 'Synthetic inputs',
    inputCitation: { surface: 'Command Center', field: 'Input classification', value: 'Synthetic inputs' },
    source: 'AURA deterministic simulation',
    freshness: {
      observedAt: ft && isParseableIso(ft.capturedAt) ? ft.capturedAt : null,
      grounded: Boolean(ft && isParseableIso(ft.capturedAt)),
    },
    run,
    telemetry: {
      state: 'unavailable',
      connected: false,
      healthy: false,
      verified: false,
      detail:
        'No facility telemetry source is configured, and configured would still not mean connected, healthy or verified.',
      citation: {
        surface: 'Integration readiness',
        field: 'Live facility telemetry',
        value: 'Not connected',
      },
    },
    visualization,
    capabilities: SERVER_CAPABILITY_BASELINE,
    readiness: {
      productionVerdict: SERVER_READINESS_BASELINE.productionVerdict,
      detail: SERVER_READINESS_BASELINE.detail,
      citation: { surface: 'Readiness', field: 'Production verdict', value: 'NO-GO' },
    },
    rejectedClientClaims: rejected,
  };
}

/* ------------------------------------------------------------------ *
 * Truth-question classification
 * ------------------------------------------------------------------ */

export type TruthTopic =
  | 'liveStatus'
  | 'telemetry'
  | 'visualization'
  | 'runProvenance'
  | 'readiness'
  | 'connectionHealth'
  | 'freshness';

const TOPIC_PATTERNS: Record<TruthTopic, RegExp> = {
  liveStatus: /\b(live|real[\s-]?time|measured|measurement|actual (data|telemetry|values)|production data|operating (for real|facility))\b/i,
  telemetry: /\btelemetry|sensor (feed|data)|data feed\b/i,
  visualization: /openusd|open usd|\busd\b|simready|sim-ready|omniverse|\bstage\b|visuali[sz]ation|\bglb\b|3d (model|view|preview)|floor plan|geometry/i,
  runProvenance: /simulation run|run (id|record|provenance)|\brun recorded\b|provenance/i,
  readiness: /readiness|production[\s-]?ready|go[\s-]?live|no[\s-]?go|\bdeploy(ed|ment)?\b|\bpublish(ed)?\b|release status/i,
  connectionHealth: /\b(connected|connection|healthy|health status|verified|configured)\b/i,
  freshness: /\bfresh(ness)?|stale|up[\s-]?to[\s-]?date|how (old|recent)|last (updated|observed)\b/i,
};

const STATUS_INTERROGATIVE = /\b(is|are|isn't|was|does|has|have|am i|can i trust|currently|right now|status|state|verdict)\b/i;
const HOW_TO = /\bhow (do|can|could|should|would|to)\b|\bsteps? (to|for)\b|\bguide\b|\bwalk me through\b/i;
const CITE_REQUEST = /\bcite|citation|evidence|proof|ground(ing|ed)?|source of truth\b/i;

export interface TruthClassification {
  isTruthQuery: boolean;
  topics: TruthTopic[];
}

/**
 * A truth question is a status/verification question about one of the truth
 * topics. How-to questions stay on the generic path unless the user
 * explicitly asks for evidence or citations.
 */
export function classifyTruthQuery(query: string): TruthClassification {
  const q = typeof query === 'string' ? query : '';
  const topics = (Object.keys(TOPIC_PATTERNS) as TruthTopic[]).filter((t) => TOPIC_PATTERNS[t].test(q));
  if (topics.length === 0) return { isTruthQuery: false, topics: [] };
  const wantsCitations = CITE_REQUEST.test(q);
  if (HOW_TO.test(q) && !wantsCitations) return { isTruthQuery: false, topics };
  const isTruthQuery = STATUS_INTERROGATIVE.test(q) || wantsCitations;
  return { isTruthQuery, topics };
}

/* ------------------------------------------------------------------ *
 * Deterministic truth answer
 * ------------------------------------------------------------------ */

export const NOT_VERIFIED = 'not verified';
export const NO_GROUNDING = 'no grounding';

export interface StructuredResponse {
  actions: Array<{ label: string; handler: string; icon?: string }>;
  insights: string[];
  nextSteps: string[];
  followUps: string[];
  [key: string]: unknown;
}

export interface TruthAnswer {
  markdown: string;
  structured: StructuredResponse;
}

export function renderTruthAnswer(query: string, envelope: FacilityEvidenceEnvelope): TruthAnswer {
  const { topics } = classifyTruthQuery(query);
  const wants = (t: TruthTopic) => topics.includes(t);
  const parts: string[] = [];
  const insights: string[] = [];

  // Core mode statement always leads: it grounds every truth topic.
  const modeCite = formatCitation(envelope.modeCitation);
  const inputCite = formatCitation(envelope.inputCitation);

  if (wants('liveStatus') || topics.length === 0) {
    parts.push(
      `**No - this facility is not live.** The workspace is operating in Simulated mode ${modeCite} on synthetic inputs ${inputCite}. Simulated is not measured: no value on this page is a measurement of a physical facility.`,
    );
    insights.push('Operating mode is SIMULATED with synthetic inputs; nothing shown is measured data.');
  } else {
    parts.push(
      `Evidence baseline: the workspace is operating in Simulated mode ${modeCite} on synthetic inputs ${inputCite}. Simulated is not measured.`,
    );
  }

  if (wants('liveStatus') || wants('telemetry') || wants('connectionHealth')) {
    parts.push(
      `Live facility telemetry is not connected ${formatCitation(envelope.telemetry.citation)}. ${envelope.telemetry.detail}`,
    );
    insights.push('Live facility telemetry: not connected, not healthy, not verified.');
  }

  if (wants('visualization')) {
    const openUsd = envelope.capabilities.find((c) => c.key === 'openUsdStage');
    const simReady = envelope.capabilities.find((c) => c.key === 'simReadyAssets');
    if (envelope.visualization.grounded) {
      const viz = envelope.visualization;
      const vizCites = viz.citations.map(formatCitation).join(' ');
      const rendererLabel = viz.renderer === 'svg-2d' ? 'a procedural 2D floor plan' : 'a procedural 3D preview';
      parts.push(
        `**No - the current visualisation is not a validated OpenUSD stage.** It is ${rendererLabel} ${vizCites}. No OpenUSD stage is mounted by an accelerated runtime anywhere in AURA [Capability registry · ${openUsd?.label}: Not available], and no asset carries a SimReady validation result [Capability registry · ${simReady?.label}: None validated].`,
      );
      insights.push(`Current visualisation: ${viz.disclosure}. ${viz.limitation ?? 'Not a validated OpenUSD stage.'}`);
    } else {
      parts.push(
        `Current view: ${NOT_VERIFIED} - this context did not supply a visualisation evidence record, so I will not characterise its renderer (${NO_GROUNDING} for that surface). What is server-known: no validated OpenUSD stage is mounted anywhere in AURA [Capability registry · ${openUsd?.label}: Not available] and no asset carries a SimReady validation result [Capability registry · ${simReady?.label}: None validated].`,
      );
      insights.push('Visualisation surface evidence missing from this context: not verified.');
    }
  }

  if (wants('runProvenance') || wants('liveStatus')) {
    if (envelope.run.recorded && envelope.run.verified && envelope.run.id) {
      const when = envelope.run.calculatedAt ? ` calculated at ${envelope.run.calculatedAt}` : '';
      parts.push(
        `Result provenance: server-verified simulation run ${envelope.run.id}${when} ${formatCitation(envelope.run.citation)}${envelope.run.persistence ? ` (${envelope.run.persistence})` : ''}. The record was read back from the platform database under the caller's own access rights. Results are simulation output, not measured production telemetry.`,
      );
    } else if (envelope.run.grounded) {
      parts.push(
        `The current AURA page shows no run ${formatCitation(envelope.run.citation)}. That statement describes this page context only - it is not proof that no run exists in the database.`,
      );
    } else {
      parts.push(
        `Run provenance: ${NOT_VERIFIED} - this context did not carry a server-verified run record, so I cannot confirm whether a run exists (${NO_GROUNDING}).`,
      );
    }
  }

  if (wants('readiness')) {
    parts.push(
      `Production readiness verdict: **No-Go** ${formatCitation(envelope.readiness.citation)}. ${envelope.readiness.detail} Deployment state is a restricted claim: without a deployment log or release-qualification artifact in this context it stays ${NOT_VERIFIED}.`,
    );
    insights.push('Production readiness: No-Go; deployment state not verified in this context.');
  }

  if (wants('connectionHealth')) {
    const unavailable = envelope.capabilities.filter((c) => !c.available);
    parts.push(
      `Capability states (${TRUTH_LADDER_NOTICE.toLowerCase()}): ${unavailable
        .map((c) => `${c.label}: not available [Capability registry · ${c.label}: ${c.requirement || 'No evidence'}]`)
        .join('; ')}. Deterministic simulation is the only verified capability [Capability registry · Deterministic simulation: Enabled].`,
    );
  }

  if (wants('freshness')) {
    if (envelope.freshness.grounded && envelope.freshness.observedAt) {
      parts.push(
        `Context capture time: ${envelope.freshness.observedAt} [Assistant context · Captured at: ${envelope.freshness.observedAt}]. This is when the page context was captured, not a telemetry observation time.`,
      );
    } else {
      parts.push(
        `Freshness: ${NOT_VERIFIED} - no observation timestamp is present in this context, so data age cannot be stated (${NO_GROUNDING}).`,
      );
    }
  }

  parts.push(
    'The assistant answers from the modelled facility and recorded simulation runs. It has no live facility feed.',
  );

  const structured: StructuredResponse = {
    actions: [],
    insights,
    nextSteps: [...GROUNDED_FALLBACK_NEXT_STEPS],
    followUps: [
      'What evidence would be required to mark live telemetry as verified?',
      'What does the recorded result provenance cover?',
      'Which capabilities are currently available in this workspace?',
    ],
  };

  return { markdown: parts.join('\n\n'), structured };
}

/* ------------------------------------------------------------------ *
 * Capability-aware structured-response gate
 * ------------------------------------------------------------------ */

/** Vocabulary that is never allowed in assistant suggestions. */
const FORBIDDEN_ALWAYS: readonly RegExp[] = [
  /real[\s-]?time/i,
  /market\s*place/i,
  /\btemplates?\b/i,
];

/** Legacy ungrounded generics that must never resurface. */
const FORBIDDEN_GENERICS: readonly RegExp[] = [
  /explore (available )?templates/i,
  /create or configure an agent/i,
  /set up workflows and integrations/i,
];

/** Verbs that require a verified available capability. None is verified. */
const CAPABILITY_VERBS = /\b(deploy|deploying|deployment|connect|connecting|activate|activation|go[\s-]?live|apply|applying|enable live)\b/i;

/** Simulation verbs: allowed only where deterministic simulation applies. */
const SIMULATION_VERBS = /\b(run|rerun|simulate|simulation)\b/i;

/** Validation verbs: allowed only in blueprint design with a report present. */
const VALIDATION_VERBS = /\bvalidat(e|ion|ing)\b/i;

export const GROUNDED_FALLBACK_NEXT_STEPS: readonly string[] = [
  'Review the operating mode and provenance indicators on the current page',
  'Open Evidence to inspect result provenance before acting on any value',
  'Check capability availability before planning connections or releases',
];

function contextSupportsSimulation(context: unknown): boolean {
  if (!isRecord(context)) return false;
  return (
    context.mode === 'simulation' ||
    context.isDataCentreDomain === true ||
    context.activePage === 'data_centre_twin' ||
    context.activeTab === 'simulation'
  );
}

function contextSupportsBlueprintValidation(context: unknown): boolean {
  if (!isRecord(context)) return false;
  return context.mode === 'blueprint-designer' && isRecord(context.validationReport);
}

/**
 * Vocabulary rules apply to every structured string, including factual
 * insights: retired Marketplace/template vocabulary and "real-time" never
 * appear, and neither do the legacy ungrounded generics.
 */
function vocabPermitted(text: string): boolean {
  if (FORBIDDEN_ALWAYS.some((p) => p.test(text))) return false;
  if (FORBIDDEN_GENERICS.some((p) => p.test(text))) return false;
  return true;
}

/**
 * Suggestion rules additionally require capability support: a suggestion may
 * only name an operation (deploy, connect, apply, run, validate, ...) when a
 * verified available capability covers it and the current state supports it.
 * Factual insights are exempt from the verb rules so negative truth
 * statements ("deployment state not verified") are not stripped.
 */
function suggestionPermitted(text: string, envelope: FacilityEvidenceEnvelope, context: unknown): boolean {
  if (!vocabPermitted(text)) return false;
  if (CAPABILITY_VERBS.test(text)) {
    // Permitted only when a verified capability covers the verb. No remote
    // capability (telemetry, runtime, deployment) is verified today.
    return false;
  }
  if (VALIDATION_VERBS.test(text) && !contextSupportsBlueprintValidation(context)) return false;
  if (SIMULATION_VERBS.test(text)) {
    const sim = envelope.capabilities.find((c) => c.key === 'simulatedMode');
    return Boolean(sim?.available) && contextSupportsSimulation(context);
  }
  return true;
}

/**
 * Gate every structured suggestion through the evidence envelope. Suggestions
 * naming unavailable capabilities, retired vocabulary or ungrounded generics
 * are removed; emptied next steps fall back to evidence-grounded steps.
 */
export function gateStructuredResponse(
  structured: unknown,
  envelope: FacilityEvidenceEnvelope,
  context: unknown,
): StructuredResponse {
  const src = isRecord(structured) ? structured : {};
  const permitted = (text: string) => suggestionPermitted(text, envelope, context);

  const actions = (Array.isArray(src.actions) ? src.actions : [])
    .filter(isRecord)
    .filter((a) => typeof a.label === 'string' && typeof a.handler === 'string')
    .filter((a) => permitted(`${a.label} ${a.handler}`)) as StructuredResponse['actions'];

  const filterSuggestions = (v: unknown): string[] =>
    (Array.isArray(v) ? v : []).filter((s): s is string => typeof s === 'string').filter(permitted);

  const insights = (Array.isArray(src.insights) ? src.insights : [])
    .filter((s): s is string => typeof s === 'string')
    .filter(vocabPermitted);
  let nextSteps = filterSuggestions(src.nextSteps);
  const followUps = filterSuggestions(src.followUps);

  if (nextSteps.length === 0) {
    nextSteps = [...GROUNDED_FALLBACK_NEXT_STEPS];
  }

  const gated: StructuredResponse = { ...src, actions, insights, nextSteps, followUps };
  return gated;
}

/* ------------------------------------------------------------------ *
 * Evidence preamble for the generic LLM path
 * ------------------------------------------------------------------ */

/**
 * Appended to every system prompt so the generic path can never contradict
 * the page truth. The envelope is authoritative and deterministic.
 */
export function buildEvidencePreamble(envelope: FacilityEvidenceEnvelope): string {
  const lines = [
    '=== SERVER EVIDENCE ENVELOPE (authoritative, deterministic) ===',
    `Operating mode: ${envelope.mode} (${envelope.inputClassification}; source: ${envelope.source}).`,
    `Live facility telemetry: not connected, not healthy, not verified.`,
    `Validated OpenUSD stage: none mounted. SimReady-validated assets: none. Accelerated GPU runtime: not connected.`,
    envelope.run.recorded && envelope.run.verified && envelope.run.id
      ? `Server-verified simulation run on record: ${envelope.run.id}.`
      : envelope.run.grounded
        ? 'The current page context shows no run. That is a page statement, not proof that no database run exists.'
        : 'No server-verified simulation run is attached to this context.',
    `Production readiness verdict: ${envelope.readiness.productionVerdict}.`,
    '',
    'HARD RULES:',
    '- Never claim the facility, data, telemetry or KPIs are live, measured or real-time.',
    '- Never claim OpenUSD, SimReady, GPU-runtime or deployment integration is active or verified.',
    `- ${TRUTH_LADDER_NOTICE}`,
    '- If evidence for a status is missing, say "not verified" or "no grounding". Never infer.',
    '- Marketplace and template galleries are retired; never suggest them.',
    '- Avoid the phrase "real-time" entirely.',
  ];
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * Streaming helper
 * ------------------------------------------------------------------ */

/** Split deterministic answers into small chunks so the UI still streams. */
export function chunkForStream(text: string, targetSize = 48): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const word of text.split(/(\s+)/)) {
    current += word;
    if (current.length >= targetSize) {
      chunks.push(current);
      current = '';
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
