import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const FACTS: Array<{ item: string; value: string; note: string }> = [
  { item: 'Deployment status', value: 'Not deployed', note: 'No DSX Exchange distribution is installed in this environment.' },
  { item: 'DSX Exchange version', value: 'None', note: 'No version is present to report.' },
  { item: 'Common Services Cluster', value: 'Not provisioned', note: 'No cluster has been provisioned or reachable.' },
  { item: 'Control Plane Clusters', value: 'Not provisioned', note: 'No control-plane cluster exists.' },
  { item: 'NATS status', value: 'Not present', note: 'No NATS server or JetStream domain is deployed.' },
  { item: 'MQTT endpoint status', value: 'Implemented, not wired', note: 'An MQTT 3.1.1 client exists but the runtime source resolver does not select the transport.' },
  { item: 'Authentication profile', value: 'Not configured', note: 'No NKey, mTLS or OAuth2 profile is configured for an exchange.' },
  { item: 'AsyncAPI schema version', value: 'Not installed', note: 'Official AsyncAPI schema packages have not been obtained.' },
  { item: 'Installed schema packages', value: '0', note: 'Conformance cannot be evaluated without official schemas.' },
  { item: 'Topic permissions', value: 'Not defined', note: 'No subject or topic permission set has been issued.' },
  { item: 'JetStream status', value: 'Not present', note: 'No stream, consumer or retention policy exists.' },
  { item: 'Last event', value: 'None', note: 'The AURA DSX ingest gateway has received zero events.' },
  { item: 'Event rate', value: '0 events/min', note: 'Point-in-time zero; no trend is rendered.' },
  { item: 'Rejected messages', value: '0', note: 'No messages have been submitted.' },
  { item: 'Schema conformance', value: 'Not evaluated', note: 'Requires official schemas and real events.' },
  { item: 'BMS mapping coverage', value: '0%', note: 'No BMS source is connected.' },
  { item: 'Prometheus status', value: 'Not connected', note: 'No Prometheus or OpenTelemetry endpoint is configured.' },
  { item: 'OpenTelemetry status', value: 'Not connected', note: 'No OTLP pipeline is configured.' },
  { item: 'GPU runtime', value: 'Not connected', note: 'No GPU device or container toolkit is available to the application.' },
  { item: 'Validation evidence', value: 'None', note: 'No vertical-slice validation has been executed.' },
];

const CHECKLIST = [
  'Obtain an entitled NVIDIA account and the official DSX Exchange distribution.',
  'Provision the Common Services Cluster and at least one Control Plane Cluster.',
  'Install the official AsyncAPI schema packages and pin their versions.',
  'Issue authentication material (NKey, mTLS or OAuth2) and topic permissions.',
  'Wire the AURA MQTT transport into the runtime source resolver.',
  'Run a vertical-slice conformance test before promoting any capability.',
];

const DOCS = [
  { label: 'NVIDIA DSX system architecture', href: 'https://docs.omniverse.nvidia.com/dsx/latest/system-architecture.html' },
  { label: 'DSX Exchange architecture', href: 'https://docs.nvidia.com/dsx-exchange/architecture' },
  { label: 'DSX Exchange integrator quickstart', href: 'https://docs.nvidia.com/dsx-exchange/integrator-quickstart' },
  { label: 'DSX Exchange repository', href: 'https://github.com/NVIDIA/dsx-exchange' },
];

export function DsxExchangeTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">DSX Exchange: not deployed</CardTitle>
          <CardDescription className="text-sm">
            Documentation existing for an official specification does not mean the specification
            is deployed. Nothing below is simulated: every value reports absence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {FACTS.map((f) => (
            <div key={f.item} className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{f.item}</p>
                <p className="text-xs text-muted-foreground">{f.note}</p>
              </div>
              <Badge variant="outline" className="text-xs">{f.value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Deployment checklist</CardTitle></CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {CHECKLIST.map((c) => <li key={c}>{c}</li>)}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Official documentation</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {DOCS.map((d) => (
              <li key={d.href}>
                <a className="underline underline-offset-4" href={d.href} target="_blank" rel="noreferrer">{d.label}</a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}