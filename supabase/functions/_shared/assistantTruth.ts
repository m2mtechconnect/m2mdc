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
 * Viewport evidence whitelist
 *
 * Mirror of src/workspace/viewportRegistry.ts. A client-supplied viewport
 * claim is accepted ONLY when its renderer, disclosure and limitation all
 * match this server-known set; anything else is rejected as ungrounded.
 * tests/unit/assistant-truth-grounding-contract.test.ts keeps the mirror in
 * sync with the registry.
 * ------------------------------------------------------------------ */

export const ALLOWED_VIEWPORT_RENDERERS = ['svg-2d', 'three-webgl'] as const;
export type AllowedViewportRenderer = (typeof ALLOWED_VIEWPORT_RENDERERS)[number];

export const ALLOWED_VIEWPORT_DISCLOSURES: readonly string[] = [
  'Procedural 3D preview, except one canary rack rendered from a validated USD-derived GLB',
  'Procedural 2D floor plan of the modelled design',
];

export const ALLOWED_VIEWPORT_LIMITATIONS: readonly string[] = ['Not a validated OpenUSD stage'];

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
    /** True when the context carried a structured run field (even "none"). */
    grounded: boolean;
    /** True when a run identity actually exists. */
    recorded: boolean;
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
    /** True only when the client supplied a whitelisted viewport record. */
    grounded: boolean;
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

/**
 * Build the server-owned evidence envelope from an untrusted request context.
 * Structured fields are read through whitelists; free prose is never treated
 * as proof, and no client field can upgrade a server baseline fact.
 */
export function buildFacilityEvidenceEnvelope(context: unknown): FacilityEvidenceEnvelope {
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

  // Run provenance. Grounded when the context carries a structured run field,
  // including the explicit "no run recorded" case (run: null).
  let run: FacilityEvidenceEnvelope['run'];
  const noRunCitation: EvidenceCitation = {
    surface: 'Run provenance',
    field: 'Simulation run',
    value: 'None recorded',
  };
  if (ft && isRecord(ft.run) && asString(ft.run.id, 80)) {
    run = {
      grounded: true,
      recorded: true,
      id: asString(ft.run.id, 80),
      status: asString(ft.run.status, 40),
      calculatedAt: isParseableIso(ft.run.calculatedAt) ? ft.run.calculatedAt : null,
      persistence: asString(ft.run.persistence, 80),
      citation: {
        surface: 'Run provenance',
        field: 'Simulation run',
        value: asString(ft.run.id, 80) as string,
      },
    };
  } else if (ft && 'run' in ft && (ft.run === null || ft.run === undefined)) {
    run = {
      grounded: true,
      recorded: false,
      id: null,
      status: null,
      calculatedAt: null,
      persistence: null,
      citation: noRunCitation,
    };
  } else if (isRecord(ctx.simulationRun) && asString(ctx.simulationRun.runId, 80)) {
    run = {
      grounded: true,
      recorded: true,
      id: asString(ctx.simulationRun.runId, 80),
      status: asString(ctx.simulationRun.status, 40),
      calculatedAt: isParseableIso(ctx.simulationRun.startedAt) ? ctx.simulationRun.startedAt : null,
      persistence: 'Simulation context',
      citation: {
        surface: 'Simulation run panel',
        field: 'Run ID',
        value: asString(ctx.simulationRun.runId, 80) as string,
      },
    };
  } else {
    run = {
      grounded: false,
      recorded: false,
      id: null,
      status: null,
      calculatedAt: null,
      persistence: null,
      citation: noRunCitation,
    };
  }

  // Visualization: accepted only when every field matches the server-known
  // viewport registry mirror. A non-matching claim is rejected, not softened.
  let visualization: FacilityEvidenceEnvelope['visualization'] = {
    grounded: false,
    renderer: null,
    disclosure: null,
    limitation: null,
    validatedOpenUsdStage: false,
    citations: [],
  };
  if (ft && isRecord(ft.viewport)) {
    const renderer = asString(ft.viewport.renderer, 40);
    const disclosure = asString(ft.viewport.disclosure, 200);
    const limitation = asString(ft.viewport.limitation, 200);
    const rendererOk = ALLOWED_VIEWPORT_RENDERERS.includes(renderer as AllowedViewportRenderer);
    const disclosureOk = disclosure !== null && ALLOWED_VIEWPORT_DISCLOSURES.includes(disclosure);
    const limitationOk = limitation === null || ALLOWED_VIEWPORT_LIMITATIONS.includes(limitation);
    if (rendererOk && disclosureOk && limitationOk) {
      const citations: EvidenceCitation[] = [
        { surface: 'Facility viewport', field: 'Disclosure', value: disclosure as string },
      ];
      if (limitation) {
        citations.push({ surface: 'Facility viewport', field: 'Limitation', value: limitation });
      }
      visualization = {
        grounded: true,
        renderer: renderer as AllowedViewportRenderer,
        disclosure,
        limitation,
        validatedOpenUsdStage: false,
        citations,
      };
    } else {
      rejected.push('viewport evidence rejected: claim does not match the viewport registry');
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
    if (envelope.run.recorded && envelope.run.id) {
      const when = envelope.run.calculatedAt ? ` calculated at ${envelope.run.calculatedAt}` : '';
      parts.push(
        `Result provenance: simulation run ${envelope.run.id}${when} ${formatCitation(envelope.run.citation)}${envelope.run.persistence ? ` (${envelope.run.persistence})` : ''}. Results are simulation output, not measured production telemetry.`,
      );
    } else if (envelope.run.grounded) {
      parts.push(
        `No simulation run has been recorded ${formatCitation(envelope.run.citation)}, so no result provenance exists yet.`,
      );
    } else {
      parts.push(
        `Run provenance: ${NOT_VERIFIED} - this context did not include a run provenance field, so I cannot confirm whether a run exists (${NO_GROUNDING}).`,
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
    envelope.run.recorded && envelope.run.id
      ? `Simulation run on record: ${envelope.run.id}.`
      : `No simulation run is recorded in this context.`,
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
