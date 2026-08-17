import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const REASONS = [
  'The existing MCP-labelled components are generic HTTP and catalogue scaffolding.',
  'No protocol handshake (JSON-RPC 2.0 initialize) is proven.',
  'No runtime tool discovery is proven.',
  'No production MCP server is registered.',
  'No MCP tool has been invoked.',
];

const FUTURE_REQUIREMENTS = [
  'Official MCP SDK',
  'JSON-RPC 2.0 with initialize and protocol-version negotiation',
  'Streamable HTTP for remote servers',
  'tools/list, tools/call, resources/list, resources/read',
  'OAuth or cloud identity',
  'Tool allowlists and read-only default',
  'Human approval for writes',
  'Complete audit logging, timeouts, rate limits and tenant isolation',
];

const NATIVE_POLICY = [
  ['DSX operations', 'NATS, MQTT 3.1.1, AsyncAPI, OAuth2/mTLS/NKey'],
  ['AWS', 'AWS SDK/API, IAM roles, OIDC, CloudWatch, EventBridge, S3, Timestream, IoT SiteWise, IoT TwinMaker, EKS/ECS, Managed Prometheus'],
  ['Azure', 'Azure SDK/API, Entra ID, Managed Identity, Azure Monitor, Blob Storage, IoT Hub, Event Grid, Azure Digital Twins, AKS'],
  ['Google Cloud', 'Google Cloud APIs, Workload Identity, Cloud Monitoring, Pub/Sub, Cloud Storage, BigQuery, GKE'],
];

export function AgentToolsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Agent tools — not implemented</CardTitle>
            <Badge variant="outline" className="text-xs">Not implemented</Badge>
          </div>
          <CardDescription className="text-sm">
            AURA does not implement the Model Context Protocol. No marketplace or connect action
            is offered here because none would be genuine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {REASONS.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">What a genuine implementation would require</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {FUTURE_REQUIREMENTS.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            DSX Exchange now includes an Agentgateway bridge for MCP discovery and routing. AURA
            does not use it and will not claim to until it is deployed and validated.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Connection policy</CardTitle>
          <CardDescription className="text-sm">
            Agent tooling is optional and agent-facing. Telemetry, cloud metrics, asset storage,
            databases, simulations, ITSM and operational event ingestion use native mechanisms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {NATIVE_POLICY.map(([domain, mechanisms]) => (
            <div key={domain} className="rounded-md border border-border p-3">
              <p className="text-sm font-medium">{domain}</p>
              <p className="text-xs text-muted-foreground">{mechanisms}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}