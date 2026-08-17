/**
 * Cloud runtime readiness panel.
 *
 * Truthful, evidence-derived status for the two cloud lanes used by the MQTT
 * ingest worker (Brev and AWS). Every value below is transcribed from the
 * recorded preflight evidence at
 * docs/evidence/mqtt-cloud-runtime/preflight.md (revision 9d420a6d) - nothing
 * here is inferred, simulated or live-probed from the browser.
 */
import { useState } from 'react';
import { AlertTriangle, Loader2, Rocket, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { ConnectionInstance } from '@/connections/model';

type LaneState = 'not-authenticated' | 'not-available' | 'not-authorized';

interface LaneRow {
  label: string;
  value: string;
  state: LaneState;
  code?: string;
}

interface Lane {
  id: string;
  name: string;
  rows: LaneRow[];
}

const LANES: Lane[] = [
  {
    id: 'aws',
    name: 'AWS lane',
    rows: [
      {
        label: 'Authentication',
        value: 'Rejected by sts:GetCallerIdentity',
        state: 'not-authenticated',
        code: 'InvalidClientTokenId',
      },
      { label: 'Region', value: 'AWS_REGION not configured', state: 'not-available' },
      { label: 'Spend approval', value: 'No budget ceiling or owner approval recorded', state: 'not-authorized' },
      { label: 'Container registry', value: 'No container runtime (docker) in this environment', state: 'not-available' },
    ],
  },
  {
    id: 'brev',
    name: 'Brev lane',
    rows: [
      { label: 'Authentication', value: 'No Brev API token present', state: 'not-authenticated', code: 'NO_BREV_TOKEN' },
      { label: 'Region / instance', value: 'brev CLI not installed; no organisation authorization', state: 'not-available' },
      { label: 'Spend approval', value: 'No workspace approval recorded for cloud spend', state: 'not-authorized' },
      { label: 'Launchable', value: 'infra/brev/aura-usd-pipeline.launchable.json targets the USD pipeline, not the MQTT worker', state: 'not-available' },
    ],
  },
];

const BLOCKERS: { code: string; detail: string }[] = [
  {
    code: 'InvalidClientTokenId',
    detail: 'An error occurred (InvalidClientTokenId) when calling the GetCallerIdentity operation: The security token included in the request is invalid.',
  },
  { code: 'NO_BREV_TOKEN', detail: 'brev CLI not installed and no Brev API token or organisation authorization is available.' },
  { code: 'NO_CONTAINER_RUNTIME', detail: 'docker is not installed, so the worker image cannot be built, digested or pushed from here.' },
  { code: 'NO_SERVICE_ROLE_KEY', detail: 'SUPABASE_SERVICE_ROLE_KEY is absent, so the worker durable write path cannot be exercised.' },
  { code: 'NO_CANARY_CONNECTION', detail: '0 active signal-to-twin mappings and 0 vaulted credentials exist, so no canary connection is configured end to end.' },
  { code: 'NO_SPEND_AUTHORIZATION', detail: 'No budget or spending authorization has been recorded for either cloud lane.' },
];

const STATE_LABEL: Record<LaneState, string> = {
  'not-authenticated': 'Not authenticated',
  'not-available': 'Not available',
  'not-authorized': 'Not authorized',
};

interface CanaryResult {
  status: 'AUTHORIZED' | 'BLOCKED' | 'FAILED' | 'ERROR';
  lane: string;
  resources_changed?: boolean;
  blockers?: { code: string; detail: string }[];
  worker?: { worker_id: string; state: string } | null;
  approval_reference?: string | null;
  correlation_id?: string;
  message?: string;
}

export function RuntimeReadinessPanel({ connections = [] }: { connections?: ConnectionInstance[] }) {
  const [connectionId, setConnectionId] = useState<string>(connections[0]?.id ?? '');
  const [pendingLane, setPendingLane] = useState<string | null>(null);
  const [result, setResult] = useState<CanaryResult | null>(null);

  const selected = connectionId || connections[0]?.id || '';

  /**
   * One-click canary deployment. The gate is server-side and fail-closed: the
   * function only creates or updates a runtime worker when authentication,
   * region/target, spend approval, worker image, an active mapping and a
   * vaulted credential are all confirmed. Otherwise it records the blocker
   * and changes nothing.
   */
  const deploy = async (lane: 'brev' | 'aws') => {
    if (!selected) return;
    setPendingLane(lane);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('canary-deploy', {
        body: { lane, connection_id: selected },
      });
      if (error) {
        const details = 'context' in error && error.context ? await (error.context as Response).text() : error.message;
        let parsed: CanaryResult | null = null;
        try { parsed = JSON.parse(details) as CanaryResult; } catch { parsed = null; }
        setResult(parsed ?? { status: 'ERROR', lane, message: details });
      } else {
        setResult(data as CanaryResult);
      }
    } catch (err) {
      setResult({ status: 'ERROR', lane, message: err instanceof Error ? err.message : 'Deployment request failed.' });
    } finally {
      setPendingLane(null);
    }
  };

  return (
    <Card data-testid="runtime-readiness-panel" className="border-destructive/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden />
          Cloud runtime readiness
          <Badge variant="outline" className="border-destructive/50 text-xs text-destructive">
            Preflight blocked
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Recorded preflight evidence for the MQTT ingest worker, revision 9d420a6d. No cloud
          infrastructure is provisioned and actual spend is 0.00 USD.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {LANES.map((lane) => (
            <div key={lane.id} className="min-w-0 rounded-md border border-border p-3">
              <p className="text-sm font-medium">{lane.name}</p>
              <ul className="mt-2 space-y-2">
                {lane.rows.map((row) => (
                  <li key={row.label} className="min-w-0 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{row.label}</span>
                      <Badge variant="outline" className="text-[11px]">{STATE_LABEL[row.state]}</Badge>
                      {row.code && (
                        <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-destructive">{row.code}</code>
                      )}
                    </div>
                    <p className="mt-0.5 break-words text-muted-foreground">{row.value}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-border p-3" data-testid="canary-deploy">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Rocket className="h-4 w-4 text-muted-foreground" aria-hidden />
            One-click canary deployment
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Runtime resources are created or updated only when lane authentication, target region,
            spend approval, a published worker image, an active mapping and a vaulted credential are
            all confirmed server-side. Otherwise nothing is provisioned and the blocker is recorded
            in the connection audit trail.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="canary-connection" className="text-xs font-medium text-muted-foreground">
              Canary connection
            </label>
            <select
              id="canary-connection"
              value={selected}
              onChange={(e) => setConnectionId(e.target.value)}
              className="h-9 min-h-[32px] min-w-0 max-w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              {connections.length === 0 && <option value="">No connection available</option>}
              {connections.map((c) => (
                <option key={c.id} value={c.id}>{c.display_name}</option>
              ))}
            </select>
            {(['brev', 'aws'] as const).map((lane) => (
              <Button
                key={lane}
                type="button"
                size="sm"
                variant="outline"
                className="h-9 text-xs"
                disabled={!selected || pendingLane !== null}
                aria-describedby={!selected ? 'canary-disabled-reason' : undefined}
                onClick={() => deploy(lane)}
                data-testid={`canary-deploy-${lane}`}
              >
                {pendingLane === lane && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />}
                Deploy canary ({lane === 'aws' ? 'AWS' : 'Brev'})
              </Button>
            ))}
          </div>
          {!selected && (
            <p id="canary-disabled-reason" className="mt-2 text-xs text-muted-foreground">
              Currently unavailable: no connection exists to deploy a canary for. Create a connection
              in the Catalogue tab first.
            </p>
          )}

          {result && (
            <div
              className="mt-3 rounded-md border border-border p-3"
              role="status"
              aria-live="polite"
              data-testid="canary-deploy-result"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className={result.status === 'AUTHORIZED' ? 'text-[11px]' : 'border-destructive/50 text-[11px] text-destructive'}>
                  {result.status}
                </Badge>
                <span className="text-muted-foreground">
                  {result.resources_changed ? 'Runtime resources updated' : 'No runtime resources created or updated'}
                </span>
                {result.correlation_id && (
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{result.correlation_id}</code>
                )}
              </div>
              {result.status === 'AUTHORIZED' && result.worker && (
                <p className="mt-2 break-words text-xs text-muted-foreground">
                  Worker {result.worker.worker_id} is {result.worker.state}
                  {result.approval_reference ? ` under approval ${result.approval_reference}` : ''}.
                </p>
              )}
              {result.blockers && result.blockers.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {result.blockers.map((b) => (
                    <li key={b.code} className="min-w-0 text-xs">
                      <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-destructive">{b.code}</code>
                      <p className="mt-0.5 break-words text-muted-foreground">{b.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
              {result.message && <p className="mt-2 break-words text-xs text-muted-foreground">{result.message}</p>}
            </div>
          )}
        </div>

        <div className="rounded-md border border-border p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
            Why preflight is blocked
          </p>
          <ul className="mt-2 space-y-2">
            {BLOCKERS.map((blocker) => (
              <li key={blocker.code} className="min-w-0 text-xs">
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-destructive">{blocker.code}</code>
                <p className="mt-0.5 break-words text-muted-foreground">{blocker.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            To unblock: supply a valid AWS account with a region and a tagged spending limit, a Brev
            organisation token, a container registry target and a service-role write path through
            deployment secret injection, then configure one canary connection with an active mapping
            and a vaulted credential.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default RuntimeReadinessPanel;
