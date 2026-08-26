/**
 * Enterprise Readiness Supervisor (Phase 1).
 *
 * One governed supervisor experience with explicit specialist-domain
 * perspectives. Deterministic and read-only: the assessment is computed from
 * existing repository and route metadata, the release gate defaults to No-Go
 * until mandatory evidence is present, and absent evidence is rendered as
 * "Not assessed" / "Unavailable" rather than a fabricated score.
 *
 * The persona selector re-prioritizes findings and changes explanations only;
 * it never changes authorization.
 */
import { useMemo, useState } from 'react';
import {
  Activity,
  BookOpenText,
  ClipboardCheck,
  CloudCog,
  Cpu,
  KeyRound,
  LifeBuoy,
  Network,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionCard, WorkspaceHeader } from '@/components/workspace-system';
import {
  ACTIVE_RUNTIME,
  ACTIVATION_TRIGGERS,
  AUTOMATIC_TRIGGERS,
  CONNECTOR_POLICIES,
  DR_EXERCISE_STATUS,
  DR_READINESS_FIELDS,
  DR_TRUTH_NOTE,
  KNOWLEDGE_SOURCES,
  OBSERVABILITY_SIGNALS,
  PORTABILITY_MATRIX,
  PORTABILITY_STAGES,
  READINESS_CATEGORIES,
  READINESS_CATEGORY_LABEL,
  READINESS_FINDINGS,
  REDACTION_POLICY,
  RELEASE_PROFILES,
  RELEASE_PROFILE_DESCRIPTION,
  RELEASE_PROFILE_LABEL,
  RUNTIME_BOUNDARIES,
  SPECIALIST_DOMAINS,
  SUPERVISOR_PERSONAS,
  evaluateReleaseGate,
  evaluateReleaseGateForProfile,
  prioritizeFindings,
  resolveActivation,
  supervisorPersona,
  type DrFieldState,
  type FindingSeverity,
  type FindingStatus,
  type ObservabilitySignalStatus,
  type ReadinessCategory,
  type SupervisorPersonaId,
} from '@/supervisor';

const STATUS_LABEL: Record<FindingStatus, string> = {
  pass: 'Evidenced',
  gap: 'Gap',
  'not-assessed': 'Not assessed',
  unavailable: 'Unavailable',
};

const STATUS_BADGE_CLASS: Record<FindingStatus, string> = {
  pass: 'bg-accent/15 text-accent-foreground border-transparent',
  gap: 'bg-destructive/10 text-destructive border-transparent',
  'not-assessed': 'bg-muted text-muted-foreground border-transparent',
  unavailable: 'bg-muted text-muted-foreground border-transparent',
};

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  blocker: 'Blocker',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

const DISPOSITION_LABEL = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  superseded: 'Superseded',
  unresolved: 'Unresolved',
} as const;

const TRIGGER_LABEL: Record<(typeof ACTIVATION_TRIGGERS)[number], string> = {
  'manual-open': 'Manual open',
  'edit-completion': 'Edit completion',
  'change-review': 'Change / PR review',
  'preview-qualification': 'Preview qualification',
  'deployment-request': 'Deployment request',
  'post-publish-smoke': 'Post-publish smoke',
};

const CONNECTOR_STATE_LABEL = {
  connected: 'Connected',
  unavailable: 'Unavailable',
  'not-assessed': 'Not assessed',
} as const;

const REDACTION_LABEL = {
  'pending-review': 'Pending review',
  'approved-redacted': 'Approved (redacted)',
  'rejected-sensitive': 'Rejected (sensitive)',
} as const;

const OBSERVABILITY_STATUS_LABEL: Record<ObservabilitySignalStatus, string> = {
  verified: 'Verified',
  'not-tested': 'Not tested',
  unavailable: 'Unavailable',
  'not-assessed': 'Not assessed',
};

const OBSERVABILITY_STATUS_BADGE: Record<ObservabilitySignalStatus, string> = {
  verified: 'bg-accent/15 text-accent-foreground border-transparent',
  'not-tested': 'bg-muted text-muted-foreground border-transparent',
  unavailable: 'bg-muted text-muted-foreground border-transparent',
  'not-assessed': 'bg-muted text-muted-foreground border-transparent',
};

const DR_STATE_LABEL: Record<DrFieldState, string> = {
  documented: 'Documented',
  exercised: 'Exercised',
  'not-defined': 'Not defined',
  'not-assessed': 'Not assessed',
};

export default function Supervisor() {
  const [personaId, setPersonaId] = useState<SupervisorPersonaId>('executive');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ReadinessCategory>('all');

  const persona = supervisorPersona(personaId);
  const findings = useMemo(() => prioritizeFindings(READINESS_FINDINGS, persona), [persona]);
  const visibleFindings = useMemo(
    () => (categoryFilter === 'all' ? findings : findings.filter((f) => f.category === categoryFilter)),
    [findings, categoryFilter],
  );
  const gate = useMemo(() => evaluateReleaseGate(READINESS_FINDINGS), []);
  const profileDecisions = useMemo(
    () => RELEASE_PROFILES.map((profile) => evaluateReleaseGateForProfile(READINESS_FINDINGS, profile)),
    [],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<FindingStatus, number> = { pass: 0, gap: 0, 'not-assessed': 0, unavailable: 0 };
    for (const finding of READINESS_FINDINGS) counts[finding.status] += 1;
    return counts;
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <WorkspaceHeader
        eyebrow="Govern"
        title="Enterprise Readiness Supervisor"
        description="Deterministic, read-only production-readiness assessment for enterprise clients. Capability states are reported separately as architecture-aligned, configured, connected, tested, deployed and operationally verified. Nothing is claimed without evidence."
        icon={ShieldCheck}
        badges={
          <>
            <Badge
              variant="outline"
              className={
                gate.decision === 'go'
                  ? 'bg-accent/15 text-accent-foreground border-transparent'
                  : 'bg-destructive/10 text-destructive border-transparent'
              }
            >
              Release gate: {gate.decision === 'go' ? 'Go' : 'No-Go'}
            </Badge>
            <Badge variant="outline" className="bg-muted text-muted-foreground border-transparent">
              {ACTIVE_RUNTIME.label}
            </Badge>
            <Badge variant="outline" className="bg-muted text-muted-foreground border-transparent">
              Read-only - no production mutation
            </Badge>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Select value={personaId} onValueChange={(v) => setPersonaId(v as SupervisorPersonaId)}>
              <SelectTrigger className="h-8 w-[13rem] text-xs" aria-label="Supervisor persona">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {SUPERVISOR_PERSONAS.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        meta={
          <p className="text-xs text-muted-foreground">
            Persona changes priorities and explanations only. Authorization is unchanged and remains governed by route guards and RLS.
          </p>
        }
      />

      {/* Executive overview + release gate */}
      <SectionCard
        title="Executive overview"
        description="Readiness posture across eleven evidence-backed categories. Counts are derived from recorded findings, never estimated."
        icon={ClipboardCheck}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(STATUS_LABEL) as FindingStatus[]).map((status) => (
            <div key={status} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{STATUS_LABEL[status]}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{statusCounts[status]}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{persona.narrative}</p>
      </SectionCard>

      <SectionCard
        tone="technical"
        title="Release gate"
        description="Defaults to No-Go until every mandatory category carries passing evidence and no blocker-severity finding is unresolved."
        icon={gate.decision === 'go' ? ShieldCheck : ShieldAlert}
      >
        <p className="text-sm font-medium">
          Decision: {gate.decision === 'go' ? 'Go' : 'No-Go'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mandatory categories: {gate.mandatoryCategories.map((c) => READINESS_CATEGORY_LABEL[c]).join(', ')}.
        </p>
        {gate.blockers.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground" data-testid="release-gate-blockers">
            {gate.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">No blocking findings.</p>
        )}
      </SectionCard>

      {/* Release qualification profiles */}
      <SectionCard
        title="Release qualification profiles"
        description="Two governed profiles evaluate the same findings. The default is conservative and never downgrades blockers; the pilot profile may exempt the accelerated-runtime blocker only while that capability is visibly marked Unavailable and all truth/provenance controls pass. Exemptions are reported explicitly."
        icon={ClipboardCheck}
      >
        <div className="grid gap-4 md:grid-cols-2" data-testid="release-profiles">
          {profileDecisions.map((decision) => (
            <article key={decision.profile} className="rounded-lg border border-border bg-card p-4" data-testid={`release-profile-${decision.profile}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{RELEASE_PROFILE_LABEL[decision.profile]}</h3>
                <Badge
                  variant="outline"
                  className={
                    decision.decision === 'go'
                      ? 'bg-accent/15 text-accent-foreground border-transparent'
                      : 'bg-destructive/10 text-destructive border-transparent'
                  }
                >
                  {decision.decision === 'go' ? 'Go' : 'No-Go'}
                </Badge>
                {decision.profile === 'accelerated-runtime-enterprise' ? (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-transparent">Default</Badge>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{RELEASE_PROFILE_DESCRIPTION[decision.profile]}</p>
              {decision.exemptedFindings.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {decision.exemptedFindings.map((exemption) => (
                    <li key={exemption.id}>
                      Exempted: <code className="font-mono text-xs">{exemption.id}</code> - {exemption.reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No exemptions applied.</p>
              )}
            </article>
          ))}
        </div>
      </SectionCard>

      {/* Observability readiness */}
      <SectionCard
        title="Observability readiness"
        description="Monitoring, alerting, telemetry freshness and incident signals. A contract-tested client adapter is not live monitoring; nothing here is Verified without end-to-end evidence."
        icon={Activity}
      >
        <ul className="space-y-2" data-testid="observability-readiness">
          {OBSERVABILITY_SIGNALS.map((signal) => (
            <li key={signal.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
              <Badge variant="outline" className={OBSERVABILITY_STATUS_BADGE[signal.status]}>
                {OBSERVABILITY_STATUS_LABEL[signal.status]}
              </Badge>
              <span className="text-sm font-medium">{signal.label}</span>
              <span className="text-xs text-muted-foreground">{signal.note}</span>
              {signal.evidenceRef ? (
                <code className="font-mono text-xs text-muted-foreground">{signal.evidenceRef}</code>
              ) : null}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Resilience and DR readiness */}
      <SectionCard
        title="Resilience and DR readiness"
        description={DR_TRUTH_NOTE}
        icon={LifeBuoy}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="dr-readiness">
          {DR_READINESS_FIELDS.map((field) => (
            <article key={field.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{field.label}</h3>
                <Badge
                  variant="outline"
                  className={
                    field.state === 'exercised'
                      ? 'bg-accent/15 text-accent-foreground border-transparent'
                      : field.state === 'documented'
                        ? 'bg-muted text-muted-foreground border-transparent'
                        : 'bg-muted text-muted-foreground border-transparent'
                  }
                >
                  {DR_STATE_LABEL[field.state]}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{field.note}</p>
              {field.evidenceRef ? (
                <code className="mt-1 block font-mono text-xs text-muted-foreground">{field.evidenceRef}</code>
              ) : null}
            </article>
          ))}
          <article className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Exercise status</h3>
              <Badge variant="outline" className="bg-muted text-muted-foreground border-transparent">
                {DR_EXERCISE_STATUS.state === 'exercise-recorded' ? 'Exercise recorded' : 'Not exercised'}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{DR_EXERCISE_STATUS.note}</p>
          </article>
        </div>
      </SectionCard>

      {/* Multicloud portability */}
      <SectionCard
        title="Multicloud portability"
        description="Designed, configured, tested and verified are reported separately per target. Verified requires every lower stage to carry artifact evidence; deployment support is never implied without artifacts."
        icon={CloudCog}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" data-testid="portability-matrix">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">Target</th>
                {PORTABILITY_STAGES.map((stage) => (
                  <th key={stage} scope="col" className="py-2 pr-3 font-medium capitalize">{stage}</th>
                ))}
                <th scope="col" className="py-2 font-medium">Current claim</th>
              </tr>
            </thead>
            <tbody>
              {PORTABILITY_MATRIX.map((target) => (
                <tr key={target.id} className="border-b border-border last:border-0" data-testid={`portability-${target.id}`}>
                  <td className="py-2 pr-3 font-medium text-foreground">{target.label}</td>
                  {PORTABILITY_STAGES.map((stageName) => {
                    const evidence = target.stages.find((s) => s.stage === stageName);
                    const evidenced = evidence?.state === 'evidenced';
                    return (
                      <td key={stageName} className="py-2 pr-3">
                        <span
                          className={
                            evidenced
                              ? 'inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-foreground'
                              : 'inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                          }
                          title={
                            evidenced
                              ? `Evidence: ${evidence?.evidenceRef}${evidence?.note ? ` - ${evidence.note}` : ''}`
                              : `Not evidenced${evidence?.note ? ` - ${evidence.note}` : ''}`
                          }
                        >
                          {evidenced ? 'Evidenced' : 'Not evidenced'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-2 text-muted-foreground">{target.currentClaim}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Activation modes */}
      <SectionCard
        title="Activation and status"
        description="The supervisor is reachable manually from this route and is invoked automatically in read-only assessment mode on edit completion, change review, preview qualification, deployment requests and post-publish smoke checks. Automatic invocation never changes user authorization and never grants itself new permissions."
        icon={KeyRound}
      >
        <div className="grid gap-4 md:grid-cols-3" data-testid="activation-panel">
          <article className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-accent/15 text-accent-foreground border-transparent">Active now</Badge>
              <h3 className="text-sm font-semibold">Manual</h3>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{resolveActivation('manual-open').note}</p>
          </article>
          <article className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-muted text-muted-foreground border-transparent">Read-only</Badge>
              <h3 className="text-sm font-semibold">Automatic assessment</h3>
            </div>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              {AUTOMATIC_TRIGGERS.map((trigger) => (
                <li key={trigger}>{TRIGGER_LABEL[trigger]}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{resolveActivation('edit-completion').note}</p>
          </article>
          <article className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-transparent">Approval required</Badge>
              <h3 className="text-sm font-semibold">Elevated</h3>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Scoped write capability requires an explicitly recorded approval. Human approval remains mandatory for merges,
              destructive data actions, database migrations and production publication. All grants are least-privilege,
              time-bounded where supported, revocable and auditable.
            </p>
          </article>
        </div>
      </SectionCard>

      {/* Permission broker matrix */}
      <SectionCard
        title="Permission broker"
        description="Per-connector capability planes. Configured means the capability exists in the catalog; granted means an active scoped grant with recorded approval exists; completed means an audit record proves the action ran. Connector state is reported from evidence only."
        icon={Network}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" data-testid="permission-matrix">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">Connector</th>
                <th scope="col" className="py-2 pr-3 font-medium">Read-only default</th>
                <th scope="col" className="py-2 pr-3 font-medium">Elevated (scoped approval)</th>
                <th scope="col" className="py-2 pr-3 font-medium">Always human approval</th>
                <th scope="col" className="py-2 font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {CONNECTOR_POLICIES.map((policy) => (
                <tr key={policy.id} className="border-b border-border last:border-0" data-testid={`connector-${policy.id}`}>
                  <td className="py-2 pr-3 font-medium text-foreground">{policy.label}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{policy.defaultCapabilities.join(', ')}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {policy.elevatedCapabilities.length > 0 ? policy.elevatedCapabilities.join(', ') : 'None'}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {policy.humanApprovalAlways.length > 0 ? policy.humanApprovalAlways.join(', ') : 'None'}
                  </td>
                  <td className="py-2">
                    <Badge
                      variant="outline"
                      className={
                        policy.state === 'connected'
                          ? 'bg-accent/15 text-accent-foreground border-transparent'
                          : policy.state === 'unavailable'
                            ? 'bg-destructive/10 text-destructive border-transparent'
                            : 'bg-muted text-muted-foreground border-transparent'
                      }
                      title={policy.stateNote}
                    >
                      {CONNECTOR_STATE_LABEL[policy.state]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Every decision records actor, requested capability, scope, approval, action, result and evidence. When a connector,
          approval or verified identity is unavailable, the broker fails closed. Credentials remain in platform secret managers
          and are issued per task; cookies, tokens, session storage, service-role material, raw tenant data and personal data
          are never ingested into supervisor knowledge.
        </p>
      </SectionCard>

      {/* Specialist domains */}
      <SectionCard
        title="Specialist domains"
        description="One supervisor experience backed by eight explicit specialist perspectives. Stage maturity is evidenced per stage; unproven stages are marked not evidenced."
        icon={Cpu}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {SPECIALIST_DOMAINS.map((domain) => (
            <article key={domain.id} className="rounded-lg border border-border bg-card p-4" data-testid={`domain-${domain.id}`}>
              <h3 className="text-sm font-semibold">{domain.label}</h3>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                {domain.scope.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`${domain.label} capability stages`}>
                {domain.stages.map((stage) => (
                  <li key={stage.stage}>
                    <span
                      className={
                        stage.state === 'evidenced'
                          ? 'inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-foreground'
                          : 'inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                      }
                      title={
                        stage.state === 'evidenced'
                          ? `Evidence: ${stage.evidenceRef}${stage.note ? ` - ${stage.note}` : ''}`
                          : `Not evidenced${stage.note ? ` - ${stage.note}` : ''}`
                      }
                    >
                      {stage.stage}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">{domain.currentClaim}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      {/* Readiness assessment */}
      <SectionCard
        title="Production-readiness assessment"
        description="Each finding records status, severity, evidence source, affected routes/files, recommended action, owner and verification method."
        icon={BookOpenText}
        actions={
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as 'all' | ReadinessCategory)}>
            <SelectTrigger className="h-8 w-[12rem] text-xs" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all" className="text-xs">All categories</SelectItem>
              {READINESS_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category} className="text-xs">
                  {READINESS_CATEGORY_LABEL[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <ul className="space-y-3" data-testid="readiness-findings">
          {visibleFindings.map((finding) => (
            <li key={finding.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={STATUS_BADGE_CLASS[finding.status]}>
                  {STATUS_LABEL[finding.status]}
                </Badge>
                <Badge variant="outline" className="bg-muted text-muted-foreground border-transparent">
                  {SEVERITY_LABEL[finding.severity]}
                </Badge>
                <span className="text-xs text-muted-foreground">{READINESS_CATEGORY_LABEL[finding.category]}</span>
              </div>
              <h3 className="mt-2 text-sm font-semibold">{finding.title}</h3>
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-foreground">Evidence</dt>
                  <dd>
                    {finding.evidenceSource}
                    {finding.evidenceRef ? (
                      <>
                        {' '}
                        <code className="font-mono text-xs">{finding.evidenceRef}</code>
                      </>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Recommended action</dt>
                  <dd>{finding.recommendedAction}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Affected routes</dt>
                  <dd>{finding.affectedRoutes.length > 0 ? finding.affectedRoutes.join(', ') : 'None route-scoped'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Affected files</dt>
                  <dd className="font-mono text-xs">{finding.affectedFiles.join(', ')}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Owner</dt>
                  <dd>{supervisorPersona(finding.ownerPersona).label}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Verification method</dt>
                  <dd>{finding.verificationMethod}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Knowledge source registry */}
      <SectionCard
        title="Knowledge source registry"
        description={REDACTION_POLICY}
        icon={BookOpenText}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">Source</th>
                <th scope="col" className="py-2 pr-3 font-medium">Kind</th>
                <th scope="col" className="py-2 pr-3 font-medium">Disposition</th>
                <th scope="col" className="py-2 pr-3 font-medium">Redaction</th>
                <th scope="col" className="py-2 font-medium">Regression case</th>
              </tr>
            </thead>
            <tbody>
              {KNOWLEDGE_SOURCES.map((source) => (
                <tr key={source.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">
                    <span className="font-medium text-foreground">{source.title}</span>
                    <br />
                    <code className="font-mono text-xs text-muted-foreground">{source.ref}</code>
                    {source.note ? (
                      <>
                        <br />
                        <span className="text-muted-foreground">{source.note}</span>
                      </>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{source.kind}</td>
                  <td className="py-2 pr-3">
                    <Badge
                      variant="outline"
                      className={
                        source.disposition === 'accepted'
                          ? 'bg-accent/15 text-accent-foreground border-transparent'
                          : 'bg-muted text-muted-foreground border-transparent'
                      }
                    >
                      {DISPOSITION_LABEL[source.disposition]}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge
                      variant="outline"
                      className={
                        source.redactionState === 'approved-redacted'
                          ? 'bg-accent/15 text-accent-foreground border-transparent'
                          : source.redactionState === 'rejected-sensitive'
                            ? 'bg-destructive/10 text-destructive border-transparent'
                            : 'bg-muted text-muted-foreground border-transparent'
                      }
                    >
                      {REDACTION_LABEL[source.redactionState]}
                    </Badge>
                  </td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">
                    {source.regressionCaseRef ?? 'None'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Runtime boundary */}
      <SectionCard
        title="Supervisor runtime"
        description="Phase 1 runs a deterministic local assessment. Managed agent runtimes are integration boundaries only; none are deployed, connected or claimed."
        icon={Cpu}
      >
        <ul className="space-y-2 text-xs">
          {[ACTIVE_RUNTIME, ...RUNTIME_BOUNDARIES].map((runtime) => (
            <li key={runtime.label} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
              <Badge
                variant="outline"
                className={
                  runtime.state === 'active'
                    ? 'bg-accent/15 text-accent-foreground border-transparent'
                    : 'bg-muted text-muted-foreground border-transparent'
                }
              >
                {runtime.state === 'active' ? 'Active' : 'Integration boundary only'}
              </Badge>
              <span className="font-medium">{runtime.label}</span>
              <span className="text-muted-foreground">{runtime.note}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
