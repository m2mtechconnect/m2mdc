import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Database, Loader2, Settings, Sparkles, XCircle } from 'lucide-react';
import type { Permission } from '@/auth/permissions';
import { useRBAC } from '@/contexts/RBACContext';
import { invokeEdgeFunction } from '@/hooks/useEdgeFunction';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';

interface RuntimeProfile {
  id: string;
  label: string;
  description: string;
  available: boolean;
}

interface RuntimeConfig {
  runtimeControl: 'server_owned';
  ready: boolean;
  managedAi: { available: boolean };
  groundingSearch: { available: boolean; reason: string };
  profiles: RuntimeProfile[];
}

interface ProbeResult {
  status: 'ok' | 'error' | 'disabled' | 'not_applicable';
  latency?: number;
  error?: string;
}

interface HealthStatus {
  runtimeControl: 'server_owned';
  managedAi: ProbeResult;
  groundingSearch: ProbeResult;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeRuntimeConfig(value: unknown): RuntimeConfig {
  const payload = asRecord(value);
  const managedAi = asRecord(payload.managedAi);
  const groundingSearch = asRecord(payload.groundingSearch);
  const profiles = Array.isArray(payload.profiles)
    ? payload.profiles.flatMap((entry) => {
        const profile = asRecord(entry);
        return typeof profile.id === 'string' && typeof profile.label === 'string' && typeof profile.description === 'string'
          ? [{
              id: profile.id,
              label: profile.label,
              description: profile.description,
              available: profile.available === true,
            }]
          : [];
      })
    : [];

  return {
    runtimeControl: 'server_owned',
    ready: payload.ready === true && managedAi.available === true,
    managedAi: { available: managedAi.available === true },
    groundingSearch: {
      available: groundingSearch.available === true,
      reason: typeof groundingSearch.reason === 'string'
        ? groundingSearch.reason
        : 'Grounding readiness is not available from the server-owned runtime.',
    },
    profiles,
  };
}

function normalizeProbe(value: unknown, fallbackStatus: ProbeResult['status'], fallbackError: string): ProbeResult {
  const payload = asRecord(value);
  const status = payload.status;
  const validStatus = status === 'ok' || status === 'error' || status === 'disabled' || status === 'not_applicable';
  return {
    status: validStatus ? status : fallbackStatus,
    ...(typeof payload.latency === 'number' ? { latency: payload.latency } : {}),
    ...(typeof payload.error === 'string' ? { error: payload.error } : { error: fallbackError }),
  };
}

function normalizeHealthStatus(value: unknown): HealthStatus {
  const payload = asRecord(value);
  return {
    runtimeControl: 'server_owned',
    managedAi: normalizeProbe(payload.managedAi, 'error', 'Managed AI health evidence was incomplete.'),
    groundingSearch: normalizeProbe(
      payload.groundingSearch,
      'disabled',
      'Grounding is not exposed by the current server-owned AURA runtime contract.',
    ),
  };
}

function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { resolution, can } = useRBAC();
  if (resolution.status === 'loading') return null;
  if (resolution.status === 'pilot' || !can(permission)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AISettingsPage() {
  const { can } = useRBAC();
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthCheckedAt, setHealthCheckedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAction, setFailedAction] = useState<'load' | 'health' | null>(null);

  async function loadRuntime() {
    setLoading(true);
    setError(null);
    setFailedAction(null);
    try {
      const data = await invokeEdgeFunction('ai-config', {});
      setRuntime(normalizeRuntimeConfig(data));
    } catch (cause) {
      setRuntime(normalizeRuntimeConfig(null));
      setError(cause instanceof Error ? cause.message : 'Managed AI readiness could not be loaded.');
      setFailedAction('load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'AI Runtime & Policies | AURA DC';
    void loadRuntime();
  }, []);

  async function runHealthCheck() {
    if (checking) return;
    setChecking(true);
    setError(null);
    setFailedAction(null);
    try {
      const data = await invokeEdgeFunction('copilot-health', {});
      setHealth(normalizeHealthStatus(data));
      setHealthCheckedAt(new Date());
    } catch (cause) {
      setHealth(normalizeHealthStatus(null));
      setHealthCheckedAt(new Date());
      setError(cause instanceof Error ? cause.message : 'Managed AI health check failed.');
      setFailedAction('health');
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite" aria-busy="true">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Loading AI runtime readiness...</p>
        </div>
      </main>
    );
  }

  const managedOk = health?.managedAi.status === 'ok';
  const runtimeAvailable = runtime?.managedAi.available === true;
  const runtimeStatus = !runtimeAvailable
    ? 'Runtime unavailable'
    : managedOk
      ? 'Verified healthy'
      : health
        ? 'Verification incomplete'
        : 'Configured—not verified';
  const runtimeCardStatus = managedOk ? 'operational' : health || !runtimeAvailable ? 'critical' : 'neutral';

  return (
    <div className="w-full min-w-0 space-y-6 py-8" data-testid="ai-settings-workspace">
      <DCSectionHeader
        as="h1"
        title="AI Runtime & Policies"
        subtitle="Readiness and policy for AURA-managed intelligence. Provider, model, project and credential authority remains server-owned."
        icon={<Settings className="h-5 w-5 text-primary" />}
      />

      <div role="note" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        This browser does not configure the AI provider, raw model identifier, cloud project, residency region or provider credentials.
        Those runtime decisions are controlled by trusted server configuration. This page reports what AURA can actually execute.
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void (failedAction === 'health' ? runHealthCheck() : loadRuntime())}
            disabled={loading || checking}
          >
            {failedAction === 'health' ? 'Retry health check' : 'Retry loading readiness'}
          </Button>
        </div>
      )}

      <DCCard title="Managed AI runtime" icon={<Sparkles className="h-5 w-5 text-primary" />} status={runtimeCardStatus}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Server-owned runtime</Badge>
            <Badge variant={managedOk ? 'default' : runtimeAvailable && !health ? 'secondary' : 'destructive'}>
              {runtimeStatus}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            AURA exposes stable response profiles to product workflows. Configuration makes a profile selectable; only a successful health check verifies that the execution path is currently available.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {(runtime?.profiles ?? []).map((profile) => (
              <div key={profile.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{profile.label}</p>
                  <Badge variant="outline" className="text-xs">
                    {!profile.available ? 'Unavailable' : managedOk ? 'Verified available' : 'Configured—not verified'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{profile.description}</p>
              </div>
            ))}
          </div>
          <Button onClick={runHealthCheck} variant="outline" disabled={checking || !runtimeAvailable} aria-busy={checking}>
            {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Run runtime health check
          </Button>
        </div>
      </DCCard>

      <DCCard title="Grounding and retrieval" icon={<Database className="h-5 w-5 text-primary" />} status="neutral">
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{runtime?.groundingSearch.available === true ? 'Available' : 'Not exposed'}</Badge>
          </div>
          <p className="text-muted-foreground">
            {runtime?.groundingSearch.reason ?? 'Grounding readiness is not available.'}
          </p>
          <p className="text-xs text-muted-foreground">
            A browser-local index identifier is not treated as proof that a grounding service is configured or reachable.
          </p>
        </div>
      </DCCard>

      {health && (
        <DCCard title="Runtime health evidence" status={managedOk ? 'operational' : 'critical'}>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                {managedOk ? <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" /> : <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />}
                <div>
                  <p className="font-medium">Managed AI</p>
                  <p className="text-xs text-muted-foreground">
                    {health.managedAi.error ?? 'Server-owned execution path responded successfully.'}
                  </p>
                  {!managedOk && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      The runtime remains configured, but availability is not verified. Retry the check or ask a platform administrator to inspect the server-owned runtime evidence.
                    </p>
                  )}
                </div>
              </div>
              {typeof health.managedAi.latency === 'number' && <Badge variant="outline">{health.managedAi.latency} ms</Badge>}
            </div>
            <dl className="grid gap-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-3">
              <div>
                <dt className="font-medium text-foreground">Evidence source</dt>
                <dd>Server-owned runtime health probe</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Last checked</dt>
                <dd>{healthCheckedAt ? healthCheckedAt.toLocaleString() : 'Not checked'}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Grounding</dt>
                <dd>{health.groundingSearch.status}. {health.groundingSearch.error ?? ''}</dd>
              </div>
            </dl>
          </div>
        </DCCard>
      )}

      {can('platform.view_admin_console') && (
        <p className="text-xs text-muted-foreground">
          Platform administrators can inspect named accelerated-AI reference evidence and runtime blockers in the{' '}
          <Link to="/admin/accelerated-ai-capabilities" className="underline underline-offset-4">accelerated AI capability registry</Link>.
        </p>
      )}
    </div>
  );
}

export default function AISettings() {
  return (
    <RequirePermission permission="agent.administer">
      <AISettingsPage />
    </RequirePermission>
  );
}
