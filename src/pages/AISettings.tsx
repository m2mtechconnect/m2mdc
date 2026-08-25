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
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRuntime() {
    setLoading(true);
    setError(null);
    try {
      const data = await invokeEdgeFunction('ai-config', {});
      setRuntime(data as RuntimeConfig);
    } catch (cause) {
      setRuntime(null);
      setError(cause instanceof Error ? cause.message : 'Managed AI readiness could not be loaded.');
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
    try {
      const data = await invokeEdgeFunction('copilot-health', {});
      setHealth(data as HealthStatus);
    } catch (cause) {
      setHealth(null);
      setError(cause instanceof Error ? cause.message : 'Managed AI health check failed.');
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
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <DCCard title="Managed AI runtime" icon={<Sparkles className="h-5 w-5 text-primary" />} status={runtime?.ready ? 'operational' : 'critical'}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Server-owned runtime</Badge>
            <Badge variant={runtime?.managedAi.available ? 'default' : 'destructive'}>
              {runtime?.managedAi.available ? 'Runtime configured' : 'Runtime unavailable'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            AURA exposes stable response profiles to product workflows. A profile is available only when the server-owned managed runtime is configured.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {(runtime?.profiles ?? []).map((profile) => (
              <div key={profile.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{profile.label}</p>
                  <Badge variant="outline" className="text-[11px]">{profile.available ? 'Available' : 'Unavailable'}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{profile.description}</p>
              </div>
            ))}
          </div>
          <Button onClick={runHealthCheck} variant="outline" disabled={checking || !runtime?.managedAi.available} aria-busy={checking}>
            {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Run runtime health check
          </Button>
        </div>
      </DCCard>

      <DCCard title="Grounding and retrieval" icon={<Database className="h-5 w-5 text-primary" />} status="neutral">
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{runtime?.groundingSearch.available ? 'Available' : 'Not exposed'}</Badge>
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
                  <p className="text-xs text-muted-foreground">{health.managedAi.error ?? 'Server-owned execution path responded successfully.'}</p>
                </div>
              </div>
              {typeof health.managedAi.latency === 'number' && <Badge variant="outline">{health.managedAi.latency} ms</Badge>}
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              Grounding: {health.groundingSearch.status}. {health.groundingSearch.error ?? ''}
            </div>
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
