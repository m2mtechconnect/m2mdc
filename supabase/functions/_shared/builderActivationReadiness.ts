/**
 * One activation-readiness decision shared by the browser and the trusted
 * builders-deploy boundary. Browser state is only an affordance; the Edge
 * Function must recompute this decision from persisted configuration/evidence.
 */

export type ReadinessStatus = 'ready' | 'blocked' | 'warning';

export interface ActivationReadinessEvidence {
  verifiedSimulationCount: number;
  versionCount: number;
  workflowCount?: number;
  intelligenceConfigured?: boolean;
  facilityAvailable?: boolean;
  evidenceError?: string | null;
}

export interface ActivationReadinessCheck {
  id: string;
  label: string;
  status: ReadinessStatus;
  message: string;
}

export interface ActivationReadinessResult {
  isReady: boolean;
  score: number;
  blockers: ActivationReadinessCheck[];
  warnings: ActivationReadinessCheck[];
  checks: ActivationReadinessCheck[];
}

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function nonEmpty(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function count(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function check(
  id: string,
  label: string,
  passed: boolean,
  message: string,
  severity: 'blocker' | 'warning' = 'blocker',
): ActivationReadinessCheck {
  return {
    id,
    label,
    status: passed ? 'ready' : severity === 'blocker' ? 'blocked' : 'warning',
    message,
  };
}

/** Pure, deterministic readiness decision. Never accepts a client "ready" flag. */
export function evaluateBuilderActivationReadiness(
  rawConfig: unknown,
  evidence: ActivationReadinessEvidence,
): ActivationReadinessResult {
  const config = record(rawConfig);
  const overview = record(config.overview);
  const workflow = record(config.workflow);
  const modelConfig = record(config.model_config ?? config.modelConfig);
  const intelligence = record(config.intelligence);
  const governance = record(config.governance);

  const goal = config.goal ?? overview.twinSummary ?? overview.description;
  const industry = config.industry ?? overview.industry ?? overview.industries?.[0];
  const department = config.department ?? (Object.keys(overview).length ? 'IT Operations' : null);
  const type = config.type ?? (Object.keys(overview).length ? '3d_twin' : 'agent');
  const isTwin = type === '3d_twin' || type === 'process_twin';
  const workflowConfigured = count(workflow.actions) > 0
    || count(config.workflows) > 0
    || (evidence.workflowCount ?? 0) > 0;
  const intelligenceConfigured = Boolean(
    modelConfig.response_profile
    || modelConfig.model
    || intelligence.modelId
    || evidence.intelligenceConfigured,
  );
  const kpis = Array.isArray(config.kpis)
    ? config.kpis
    : Array.isArray(overview.kpis)
      ? overview.kpis
      : [];
  const twinId = config.twin_id ?? config.twinId;

  const checks: ActivationReadinessCheck[] = [
    check('goal', 'Goal', nonEmpty(goal), 'A saved goal or facility objective is required.'),
    check('industry', 'Industry', nonEmpty(industry), 'A saved industry is required.'),
    check('department', 'Department', nonEmpty(department), 'A saved department is required.'),
    check('type', 'Build type', ['agent', 'process_twin', '3d_twin'].includes(type), 'A supported build type is required.'),
    check('workflow', 'Workflow', workflowConfigured, 'At least one saved workflow action or workflow record is required.'),
    check('intelligence', 'Intelligence', intelligenceConfigured, 'A saved response profile or managed intelligence setting is required.'),
    check('kpis', 'KPIs', kpis.length > 0, 'At least one saved KPI is required for outcome verification.'),
    check(
      'verified-simulation',
      'Verified simulation',
      evidence.verifiedSimulationCount > 0,
      'At least one successful server-validated simulation is required. Browser previews and unverified runs do not qualify.',
    ),
    check('facility-binding', 'Facility binding', !isTwin || nonEmpty(twinId), 'Twin builds must be bound to a saved facility.'),
    check('facility-available', 'Facility availability', !isTwin || evidence.facilityAvailable === true, 'The bound facility is unavailable or still requires operator setup.'),
    check('evidence-read', 'Readiness evidence', !evidence.evidenceError, evidence.evidenceError || 'Persisted readiness evidence could not be verified.'),
    check(
      'integrations',
      'Connections',
      count(workflow.integrations) > 0 || count(config.connectors) > 0 || count(config.connector_ids) > 0,
      'No saved connection is configured; capability will be limited.',
      'warning',
    ),
    check('version', 'Version snapshot', evidence.versionCount > 0, 'No saved version snapshot exists yet; deployment creates one.', 'warning'),
    check(
      'governance-tags',
      'Governance tags',
      count(governance.tags) > 0,
      'No governance tags are saved for compliance tracking.',
      'warning',
    ),
  ];

  const blockers = checks.filter((item) => item.status === 'blocked');
  const warnings = checks.filter((item) => item.status === 'warning');
  const score = Math.round((checks.filter((item) => item.status === 'ready').length / checks.length) * 100);

  return { isReady: blockers.length === 0, score, blockers, warnings, checks };
}
