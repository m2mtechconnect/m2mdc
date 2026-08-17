/**
 * Cloud runtime readiness panel.
 *
 * Truthful, evidence-derived status for the two cloud lanes used by the MQTT
 * ingest worker (Brev and AWS). Every value below is transcribed from the
 * recorded preflight evidence at
 * docs/evidence/mqtt-cloud-runtime/preflight.md (revision 9d420a6d) - nothing
 * here is inferred, simulated or live-probed from the browser.
 */
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export function RuntimeReadinessPanel() {
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
