/**
 * Enterprise Readiness Supervisor — Phase 1 contract.
 *
 * Guards the supervisor's truth rules:
 *  - route is mounted behind the permission guard and declared in the registry
 *  - eight specialist domains with truthful capability stages (NVIDIA/DSX may
 *    not claim connected/deployed/verified without evidence)
 *  - every readiness finding carries the full evidence tuple; a pass requires
 *    an evidence reference
 *  - the release gate is deterministic and defaults to No-Go without
 *    mandatory evidence
 *  - persona selection changes ordering/explanations, never the finding set
 *  - knowledge sources carry disposition + redaction state, and only
 *    approved-redacted, non-rejected sources are ingestible
 *  - no raw provider/model identifiers leak into the supervisor bundle
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ACTIVE_RUNTIME,
  ACTIVATION_MODES,
  AUTOMATIC_TRIGGERS,
  CAPABILITY_STAGES,
  CONNECTOR_IDS,
  CONNECTOR_POLICIES,
  KNOWLEDGE_SOURCES,
  MANDATORY_GATE_CATEGORIES,
  READINESS_CATEGORIES,
  READINESS_FINDINGS,
  RUNTIME_BOUNDARIES,
  SPECIALIST_DOMAINS,
  SUPERVISOR_PERSONAS,
  actionCompleted,
  buildReadinessAssessment,
  capabilityConfigured,
  evaluateCapabilityRequest,
  evaluateReleaseGate,
  isIngestible,
  permissionGranted,
  prioritizeFindings,
  resolveActivation,
  scanForSensitiveMaterial,
  supervisorPersona,
  toRegressionCase,
  type ActivationTrigger,
  type PermissionGrant,
  type ReadinessFinding,
} from '@/supervisor';
import { INTERNAL_ROUTES } from '@/config/routeRegistry';
import { MANAGE_NAV } from '@/config/appNavigation';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('route authorization and discoverability', () => {
  it('mounts /readiness/supervisor behind PermissionRouteGuard', () => {
    const shell = read('src/AuthenticatedShell.tsx');
    const mount = shell.slice(shell.indexOf('"/readiness/supervisor"') - 60);
    expect(mount).toContain('PermissionRouteGuard');
    expect(mount).toContain('permission=');
  });

  it('declares the route in the internal registry', () => {
    const record = INTERNAL_ROUTES.find((r) => r.path === '/readiness/supervisor');
    expect(record).toMatchObject({ shell: 'internal', kind: 'canonical' });
  });

  it('exposes a governed navigation entry named Enterprise Readiness Supervisor', () => {
    const item = MANAGE_NAV.find((i) => i.fullName === 'Enterprise Readiness Supervisor');
    expect(item).toBeDefined();
    expect(item?.href).toBe('/readiness/supervisor');
    expect(item?.permission).toBe('analytics.view');
    expect(item?.group).toBe('govern');
  });

  it('builds the page on the shared workspace visual system', () => {
    const page = read('src/pages/Supervisor.tsx');
    expect(page).toContain('@/components/workspace-system');
    expect(page).toContain('<WorkspaceHeader');
    expect(page).toContain('<SectionCard');
  });
});

describe('specialist domains and capability stages', () => {
  it('defines exactly the eight governed specialist domains', () => {
    expect(SPECIALIST_DOMAINS.map((d) => d.id)).toEqual([
      'nvidia-dsx',
      'lovable-stack',
      'multicloud',
      'enterprise-security',
      'dc-operations',
      'product-persona',
      'ui-ux',
      'release-governor',
    ]);
  });

  it('orders every domain ladder by the canonical capability stages', () => {
    for (const domain of SPECIALIST_DOMAINS) {
      expect(domain.stages.map((s) => s.stage)).toEqual([...CAPABILITY_STAGES]);
    }
  });

  it('requires an evidence reference for every evidenced stage', () => {
    for (const domain of SPECIALIST_DOMAINS) {
      for (const stage of domain.stages) {
        if (stage.state === 'evidenced') {
          expect(stage.evidenceRef, `${domain.id}/${stage.stage}`).toBeTruthy();
        } else {
          expect(stage.evidenceRef).toBeNull();
        }
      }
    }
  });

  it('keeps NVIDIA/DSX at architecture alignment until runtime evidence exists', () => {
    const dsx = SPECIALIST_DOMAINS.find((d) => d.id === 'nvidia-dsx');
    expect(dsx).toBeDefined();
    const state = Object.fromEntries(dsx!.stages.map((s) => [s.stage, s.state]));
    expect(state['architecture-aligned']).toBe('evidenced');
    // No connected/tested/deployed/verified claim is permitted in Phase 1.
    for (const stage of ['connected', 'tested', 'deployed', 'operationally-verified'] as const) {
      expect(state[stage], `nvidia-dsx ${stage}`).toBe('not-evidenced');
    }
    expect(dsx!.currentClaim).not.toMatch(/fully trained/i);
  });

  it('keeps multicloud providers at alignment-only with no runtime claim', () => {
    const multicloud = SPECIALIST_DOMAINS.find((d) => d.id === 'multicloud');
    const state = Object.fromEntries(multicloud!.stages.map((s) => [s.stage, s.state]));
    expect(state['connected']).toBe('not-evidenced');
    expect(state['deployed']).toBe('not-evidenced');
  });
});

describe('readiness findings carry the full evidence tuple', () => {
  it('covers all eleven readiness categories', () => {
    const covered = new Set(READINESS_FINDINGS.map((f) => f.category));
    for (const category of READINESS_CATEGORIES) {
      expect(covered.has(category), `category ${category}`).toBe(true);
    }
  });

  it('gives every finding status, severity, evidence, action, owner and verification', () => {
    const personas = new Set(SUPERVISOR_PERSONAS.map((p) => p.id));
    for (const f of READINESS_FINDINGS) {
      expect(f.id).toBeTruthy();
      expect(f.title).toBeTruthy();
      expect(['pass', 'gap', 'not-assessed', 'unavailable']).toContain(f.status);
      expect(['blocker', 'high', 'medium', 'low', 'info']).toContain(f.severity);
      expect(f.evidenceSource).toBeTruthy();
      expect(f.recommendedAction).toBeTruthy();
      expect(personas.has(f.ownerPersona)).toBe(true);
      expect(f.verificationMethod).toBeTruthy();
      expect(Array.isArray(f.affectedRoutes)).toBe(true);
      expect(Array.isArray(f.affectedFiles)).toBe(true);
    }
  });

  it('never claims a pass without an evidence reference', () => {
    for (const f of READINESS_FINDINGS) {
      if (f.status === 'pass') {
        expect(f.evidenceRef, `${f.id} passes without evidence`).toBeTruthy();
      }
    }
  });

  it('is deterministic and read-only', () => {
    expect(buildReadinessAssessment()).toEqual(buildReadinessAssessment());
  });
});

describe('release gate', () => {
  it('defaults to No-Go while mandatory evidence is missing or blocked', () => {
    const decision = evaluateReleaseGate(READINESS_FINDINGS);
    expect(decision.decision).toBe('no-go');
    expect(decision.blockers.length).toBeGreaterThan(0);
    // The DSX runtime blocker must be part of the explanation.
    expect(decision.blockers.join(' ')).toContain('runtime-accelerated-ai');
  });

  it('is deterministic for identical input', () => {
    expect(evaluateReleaseGate(READINESS_FINDINGS)).toEqual(evaluateReleaseGate(READINESS_FINDINGS));
  });

  it('requires a pass in every mandatory category before Go', () => {
    const passFinding = (category: string): ReadinessFinding => ({
      id: `synthetic-${category}`,
      category: category as ReadinessFinding['category'],
      title: 'Synthetic pass',
      status: 'pass',
      severity: 'info',
      evidenceSource: 'synthetic test evidence',
      evidenceRef: 'tests/synthetic',
      affectedRoutes: [],
      affectedFiles: [],
      recommendedAction: 'none',
      ownerPersona: 'engineer',
      verificationMethod: 'synthetic',
    });
    const allPass = MANDATORY_GATE_CATEGORIES.map(passFinding);
    expect(evaluateReleaseGate(allPass).decision).toBe('go');

    const missingOne = allPass.filter((f) => f.category !== 'release');
    expect(evaluateReleaseGate(missingOne).decision).toBe('no-go');
  });

  it('never goes while a blocker-severity finding is unresolved', () => {
    const blocker: ReadinessFinding = {
      id: 'synthetic-blocker',
      category: 'security',
      title: 'Synthetic blocker',
      status: 'gap',
      severity: 'blocker',
      evidenceSource: 'synthetic',
      evidenceRef: null,
      affectedRoutes: [],
      affectedFiles: [],
      recommendedAction: 'fix',
      ownerPersona: 'engineer',
      verificationMethod: 'synthetic',
    };
    const passFinding: ReadinessFinding = { ...blocker, id: 'synthetic-pass', status: 'pass', severity: 'info', evidenceRef: 'x' };
    const findings = MANDATORY_GATE_CATEGORIES.map((c) => ({ ...passFinding, id: `p-${c}`, category: c }));
    expect(evaluateReleaseGate([...findings, blocker]).decision).toBe('no-go');
  });
});

describe('persona behavior', () => {
  it('offers the nine governed personas', () => {
    expect(SUPERVISOR_PERSONAS.map((p) => p.id)).toEqual([
      'executive',
      'facility-operator',
      'engineer',
      'data-scientist',
      'compliance-risk',
      'tenant-admin',
      'finance-procurement',
      'customer-success',
      'implementation-partner',
    ]);
  });

  it('changes ordering and narrative without changing the finding set', () => {
    const executive = prioritizeFindings(READINESS_FINDINGS, supervisorPersona('executive'));
    const operator = prioritizeFindings(READINESS_FINDINGS, supervisorPersona('facility-operator'));
    expect(executive.map((f) => f.id).sort()).toEqual(operator.map((f) => f.id).sort());
    expect(executive.map((f) => f.id)).not.toEqual(operator.map((f) => f.id));
    expect(supervisorPersona('executive').narrative).not.toBe(supervisorPersona('facility-operator').narrative);
    // Executive priority: release findings first.
    expect(executive[0].category).toBe('release');
  });
});

describe('knowledge source registry', () => {
  it('indexes only approved-redacted, non-rejected sources', () => {
    for (const source of KNOWLEDGE_SOURCES) {
      if (source.redactionState !== 'approved-redacted' || source.disposition === 'rejected') {
        expect(isIngestible(source), source.id).toBe(false);
      }
    }
    expect(KNOWLEDGE_SOURCES.some(isIngestible)).toBe(true);
    expect(KNOWLEDGE_SOURCES.some((s) => !isIngestible(s))).toBe(true);
  });

  it('flags secrets, credentials and personal data before approval', () => {
    expect(scanForSensitiveMaterial('token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.abc12345')).toHaveLength(1);
    expect(scanForSensitiveMaterial('use the SERVICE_ROLE_KEY from settings').map((m) => m.patternId)).toContain('service-role-reference');
    expect(scanForSensitiveMaterial('contact jane.doe@example.com')).toHaveLength(1);
    expect(scanForSensitiveMaterial('password = hunter2')).toHaveLength(1);
    expect(scanForSensitiveMaterial('ordinary architecture notes about PUE')).toHaveLength(0);
  });

  it('converts rejected or superseded mistakes into regression cases', () => {
    const stale = KNOWLEDGE_SOURCES.find((s) => s.id === 'ks-stale-prs');
    expect(stale?.disposition).toBe('superseded');
    expect(toRegressionCase(stale!)).toBe('pending-regression-case:ks-stale-prs');
    const ledger = KNOWLEDGE_SOURCES.find((s) => s.id === 'ks-remediation-ledger');
    expect(toRegressionCase(ledger!)).toBe('tests/unit/enterprise-audit-remediation.test.ts');
  });

  it('requires a disposition and redaction state on every source', () => {
    for (const source of KNOWLEDGE_SOURCES) {
      expect(['accepted', 'rejected', 'superseded', 'unresolved']).toContain(source.disposition);
      expect(['pending-review', 'approved-redacted', 'rejected-sensitive']).toContain(source.redactionState);
    }
  });
});

describe('runtime boundary truth', () => {
  it('runs Phase 1 on the deterministic local runtime only', () => {
    expect(ACTIVE_RUNTIME).toMatchObject({ kind: 'deterministic-local', state: 'active' });
    for (const boundary of RUNTIME_BOUNDARIES) {
      expect(boundary.state).toBe('integration-boundary-only');
      expect(boundary.note).toMatch(/not configured, connected or deployed/i);
    }
  });

  it('never exposes raw provider or model identifiers in the supervisor bundle', () => {
    for (const file of [
      'src/supervisor/types.ts',
      'src/supervisor/domains.ts',
      'src/supervisor/assessment.ts',
      'src/supervisor/releaseGate.ts',
      'src/supervisor/knowledgeRegistry.ts',
      'src/supervisor/personas.ts',
      'src/supervisor/runtimeIntegration.ts',
      'src/supervisor/permissionBroker.ts',
      'src/supervisor/observability.ts',
      'src/supervisor/drReadiness.ts',
      'src/supervisor/portabilityMatrix.ts',
      'src/supervisor/releaseProfiles.ts',
      'src/pages/Supervisor.tsx',
    ]) {
      const source = read(file);
      expect(source, file).not.toMatch(/gpt-|gemini-|claude-|llama-/i);
      expect(source, file).not.toContain('fully trained');
    }
  });
});

describe('activation model', () => {
  it('offers manual, automatic read-only and elevated approval-required modes', () => {
    expect([...ACTIVATION_MODES]).toEqual(['manual', 'automatic-read-only', 'elevated-approval-required']);
  });

  it('resolves every automatic trigger to read-only assessment', () => {
    expect(AUTOMATIC_TRIGGERS).toEqual([
      'edit-completion',
      'change-review',
      'preview-qualification',
      'deployment-request',
      'post-publish-smoke',
    ]);
    for (const trigger of AUTOMATIC_TRIGGERS) {
      const activation = resolveActivation(trigger);
      expect(activation.mode, trigger).toBe('automatic-read-only');
      expect(activation.readOnly, trigger).toBe(true);
    }
  });

  it('keeps manual route access read-only until a scoped grant is recorded', () => {
    const activation = resolveActivation('manual-open');
    expect(activation.mode).toBe('manual');
    expect(activation.readOnly).toBe(true);
  });

  it('renders the activation panel and permission matrix on the page', () => {
    const page = read('src/pages/Supervisor.tsx');
    expect(page).toContain('data-testid="activation-panel"');
    expect(page).toContain('data-testid="permission-matrix"');
    expect(page).toContain('data-testid={`connector-${policy.id}`}');
    expect(CONNECTOR_POLICIES.map((p) => p.id)).toEqual([...CONNECTOR_IDS]);
  });
});

describe('permission broker', () => {
  const connectedGithub = CONNECTOR_POLICIES.map((p) =>
    p.id === 'github' ? { ...p, state: 'connected' as const } : p,
  );

  it('defines the five governed connectors with the approved default planes', () => {
    expect(CONNECTOR_POLICIES.map((p) => p.id)).toEqual(['github', 'lovable', 'browser', 'supabase', 'production']);
    const byId = Object.fromEntries(CONNECTOR_POLICIES.map((p) => [p.id, p]));
    expect(byId.github.defaultCapabilities).toContain('read-diffs');
    expect(byId.github.humanApprovalAlways).toContain('merge');
    expect(byId.lovable.defaultCapabilities).toContain('read-preview');
    expect(byId.lovable.humanApprovalAlways).toContain('production-publish');
    expect(byId.browser.defaultCapabilities).toContain('capture-screenshots');
    expect(byId.browser.elevatedCapabilities).toContain('form-submission');
    expect(byId.supabase.elevatedCapabilities).toContain('service-role-operations');
    expect(byId.supabase.humanApprovalAlways).toContain('migrations');
    expect(byId.production.defaultCapabilities).toEqual(['health-checks', 'smoke-tests']);
    expect(byId.production.elevatedCapabilities).toEqual([]);
  });

  it('reports every connector state truthfully: nothing claims connected without evidence', () => {
    for (const policy of CONNECTOR_POLICIES) {
      if (policy.state === 'connected') {
        expect(policy.stateEvidenceRef, policy.id).toBeTruthy();
      } else {
        expect(['unavailable', 'not-assessed']).toContain(policy.state);
        expect(policy.stateEvidenceRef).toBeNull();
      }
    }
    // Phase 1 has no live handshake evidence inside the browser bundle.
    expect(CONNECTOR_POLICIES.every((p) => p.state === 'not-assessed')).toBe(true);
  });

  it('fails closed when the connector state is unproven, even for reads', () => {
    const decision = evaluateCapabilityRequest(
      { actor: 'supervisor', connector: 'github', capability: 'read-diffs', scope: 'repo' },
      resolveActivation('manual-open'),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.denialReason).toBe('connector-unavailable');
    expect(decision.audit.result).toBe('denied');
  });

  it('denies unknown connectors and unknown capabilities', () => {
    const unknownConnector = evaluateCapabilityRequest(
      { actor: 'a', connector: 'unknown' as never, capability: 'read', scope: 'x' },
      resolveActivation('manual-open'),
    );
    expect(unknownConnector.denialReason).toBe('unknown-connector');
    const unknownCapability = evaluateCapabilityRequest(
      { actor: 'a', connector: 'github', capability: 'delete-repository', scope: 'repo' },
      resolveActivation('manual-open'),
    );
    expect(unknownCapability.denialReason).toBe('unknown-capability');
  });

  it('keeps automatic assessments read-only against a connected connector', () => {
    for (const trigger of AUTOMATIC_TRIGGERS) {
      const activation = resolveActivation(trigger as ActivationTrigger);
      const read = evaluateCapabilityRequest(
        { actor: 'supervisor', connector: 'github', capability: 'read-diffs', scope: 'repo' },
        activation,
        [],
        connectedGithub,
      );
      expect(read.allowed, `${trigger} read`).toBe(true);
      const write = evaluateCapabilityRequest(
        {
          actor: 'supervisor',
          connector: 'github',
          capability: 'remediation-changes',
          scope: 'repo',
          approval: { required: true, recorded: true, approver: 'human', reference: 'pr-1' },
        },
        activation,
        [],
        connectedGithub,
      );
      expect(write.allowed, `${trigger} write`).toBe(false);
      expect(write.denialReason).toBe('automatic-invocation-read-only');
    }
  });

  it('blocks elevated actions without recorded approval and without an active grant', () => {
    const activation = resolveActivation('manual-open');
    const noApproval = evaluateCapabilityRequest(
      { actor: 'dev', connector: 'github', capability: 'review-comments', scope: 'pr-9' },
      activation,
      [],
      connectedGithub,
    );
    expect(noApproval.allowed).toBe(false);
    expect(noApproval.denialReason).toBe('approval-required');

    const approvedNoGrant = evaluateCapabilityRequest(
      {
        actor: 'dev',
        connector: 'github',
        capability: 'review-comments',
        scope: 'pr-9',
        approval: { required: true, recorded: true, approver: 'lead', reference: 'ticket-1' },
      },
      activation,
      [],
      connectedGithub,
    );
    expect(approvedNoGrant.allowed).toBe(false);
    expect(approvedNoGrant.denialReason).toBe('no-active-grant');
  });

  it('always requires human approval for merges, migrations and production publish', () => {
    const grant: PermissionGrant = {
      id: 'grant-1',
      actor: 'dev',
      connector: 'github',
      capability: 'merge',
      scope: 'repo',
      approval: { required: true, recorded: true, approver: 'lead', reference: 'ticket-2' },
      issuedAt: '2026-08-26T00:00:00Z',
      expiresAt: '2026-08-26T01:00:00Z',
      revocable: true,
      status: 'active',
    };
    const decision = evaluateCapabilityRequest(
      {
        actor: 'dev',
        connector: 'github',
        capability: 'merge',
        scope: 'repo',
        approval: { required: true, recorded: true, approver: 'lead', reference: 'ticket-2' },
      },
      resolveActivation('manual-open'),
      [grant],
      connectedGithub,
    );
    expect(decision.allowed).toBe(false);
    expect(decision.denialReason).toBe('human-approval-mandatory');

    for (const [connector, capability] of [
      ['supabase', 'migrations'],
      ['lovable', 'production-publish'],
    ] as const) {
      const policy = CONNECTOR_POLICIES.find((p) => p.id === connector)!;
      expect(policy.humanApprovalAlways).toContain(capability);
    }
  });

  it('records actor, capability, scope, approval, action, result and evidence on every decision', () => {
    const decision = evaluateCapabilityRequest(
      { actor: 'auditor', connector: 'production', capability: 'health-checks', scope: 'prod' },
      resolveActivation('post-publish-smoke'),
    );
    expect(decision.audit).toMatchObject({
      actor: 'auditor',
      requestedCapability: 'health-checks',
      connector: 'production',
      scope: 'prod',
      action: 'health-checks',
    });
    expect(decision.audit.approval).toBeDefined();
    expect(['allowed', 'denied']).toContain(decision.audit.result);
  });

  it('distinguishes configured, granted and completed as separate states', () => {
    expect(capabilityConfigured('github', 'merge')).toBe(true);
    expect(capabilityConfigured('github', 'delete-repository')).toBe(false);
    // Configured does not imply granted.
    expect(permissionGranted([], 'dev', 'github', 'merge')).toBe(false);
    // Granted does not imply completed.
    expect(actionCompleted([], 'dev', 'github', 'merge')).toBe(false);
    // Completed requires an allowed audit record carrying evidence.
    expect(
      actionCompleted(
        [{
          actor: 'dev',
          requestedCapability: 'merge',
          connector: 'github',
          scope: 'repo',
          approval: { required: true, recorded: true, approver: 'lead', reference: 't' },
          action: 'merge',
          result: 'allowed',
          denialReason: null,
          evidenceRef: 'ci-run-1',
        }],
        'dev',
        'github',
        'merge',
      ),
    ).toBe(true);
  });
});
