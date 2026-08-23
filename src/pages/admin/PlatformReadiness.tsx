/**
 * Platform readiness report. Static/runtime capability assessment lives here so
 * it cannot be mistaken for a configured customer connection.
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { NvidiaDsxReadinessPanel } from '@/components/integrations/NvidiaDsxReadinessPanel';
import { ClipboardCheck } from 'lucide-react';
import { DsxExchangeTab } from '@/components/connections/DsxExchangeTab';
import { AgentToolsTab } from '@/components/connections/AgentToolsTab';
import { ManagedConnectorInventory } from '@/components/connections/ManagedConnectorInventory';
import {
  CommandHeader,
  SectionHeader,
  Panel,
  SubPanel,
  Instrument,
  InstrumentGrid,
  ProvenanceBadgeV2,
  type TruthState,
} from '@/components/v2';

interface Capability {
  domain: string;
  status: string;
  evidence: string;
  blocker: string;
  owner: string;
  action: string;
  lastAssessed: string;
  documentation?: string;
}

const LAST_ASSESSED = '2026-08-21';

const CAPABILITIES: Capability[] = [
  { domain: 'Application platform', status: 'Operational', evidence: 'Authenticated application read/write verified by the server-side platform probe.', blocker: 'None', owner: 'Platform', action: 'Maintain health checks.', lastAssessed: LAST_ASSESSED },
  { domain: 'DSX Exchange', status: 'Not deployed', evidence: 'No distribution, cluster, NATS server or AsyncAPI schema package present.', blocker: 'Entitlement and infrastructure', owner: 'Platform', action: 'Complete the DSX Exchange deployment checklist.', lastAssessed: LAST_ASSESSED, documentation: 'https://docs.nvidia.com/dsx-exchange/architecture' },
  { domain: 'GPU runtime', status: 'Not connected', evidence: 'No GPU device, driver, NVIDIA DCGM feed or container runtime is reachable by the application.', blocker: 'No validated GPU runtime', owner: 'Infrastructure', action: 'Provision a validated GPU runtime and verify DCGM telemetry before promoting GPU status.', lastAssessed: LAST_ASSESSED },
  { domain: 'OpenUSD / SimReady', status: 'Partially validated', evidence: 'Canonical OpenUSD masters and approved GLB derivatives exist; no asset is SimReady-validated.', blocker: 'No GPU validation lane', owner: 'Assets', action: 'Run SimReady validation once a GPU runner exists.', lastAssessed: LAST_ASSESSED },
  { domain: 'Object storage', status: 'Target not deployed', evidence: 'AURA-managed OpenUSD storage is verified. That evidence does not establish a DDN Infinia runtime binding.', blocker: 'DDN Infinia deployment and runtime verification', owner: 'Infrastructure', action: 'Deploy the DDN binding, attach approved credentials server-side and run a dedicated storage probe before claiming DDN availability.', lastAssessed: LAST_ASSESSED },
  { domain: 'Simulation services', status: 'Deterministic simulation only', evidence: 'Seeded deterministic engines with recorded run lineage.', blocker: 'No live telemetry', owner: 'Simulation', action: 'Connect a telemetry source before claiming operational fidelity.', lastAssessed: LAST_ASSESSED },
  { domain: 'Operational telemetry', status: 'Not connected', evidence: 'Zero events received by the DSX ingest gateway. No BMS, DCIM, SNMP, BACnet, Modbus, OPC UA, Redfish or NVIDIA DCGM source is configured.', blocker: 'No operational source and unwired MQTT transport', owner: 'Operations', action: 'Wire the MQTT transport into the runtime source resolver, then onboard and verify an operational source.', lastAssessed: LAST_ASSESSED },
  { domain: 'Cloud deployment', status: 'Managed backend only', evidence: 'Application services run on the managed backend. No AWS, Azure or Google Cloud customer connector is implemented.', blocker: 'No cloud credentials or workload identity', owner: 'Platform', action: 'Adopt native cloud SDKs with workload identity when required.', lastAssessed: LAST_ASSESSED },
  { domain: 'Agent tools', status: 'Not implemented', evidence: 'No MCP handshake, discovery, registration or tool invocation exists.', blocker: 'No MCP implementation', owner: 'Assistant', action: 'Defer until connector APIs, RBAC, audit and approval layers are reliable.', lastAssessed: LAST_ASSESSED },
  { domain: 'Connection credentials', status: 'Server-side controlled', evidence: 'Connection setup submits credential material directly to the server-side vault/binding path; plaintext is not read back into the browser.', blocker: 'Each future connector still requires an approved runtime-specific credential contract.', owner: 'Security', action: 'Keep secrets server-side and independently review each new connector credential flow.', lastAssessed: LAST_ASSESSED },
  { domain: 'Validation', status: 'Partial', evidence: 'Unit, accessibility and responsive suites exist; no end-to-end vertical slice against the target NVIDIA/DDN infrastructure is yet proven.', blocker: 'Target infrastructure', owner: 'Quality', action: 'Execute a vertical slice once the required infrastructure and entitlements exist.', lastAssessed: LAST_ASSESSED },
];

/**
 * Presentation-only classification of an already-recorded status string.
 * It never upgrades a status: unverified stays unverified.
 */
function truthStateOf(status: string): TruthState {
  const s = status.toLowerCase();
  if (s.includes('operational') || s.includes('server-side controlled')) return 'live';
  if (s.includes('not deployed') || s.includes('not connected') || s.includes('not implemented')) return 'critical';
  if (s.includes('partial') || s.includes('only')) return 'simulated';
  return 'not-assessed';
}

const CLUSTER_ORDER = ['Blocked', 'Partially verified', 'Verified'] as const;

function clusterOf(state: TruthState): (typeof CLUSTER_ORDER)[number] {
  if (state === 'critical') return 'Blocked';
  if (state === 'live') return 'Verified';
  return 'Partially verified';
}

function CapabilityRow({ capability, quiet }: { capability: Capability; quiet: boolean }) {
  const state = truthStateOf(capability.status);
  return (
    <SubPanel className="min-w-0 space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{capability.domain}</p>
        <ProvenanceBadgeV2 state={state} label={capability.status} />
      </div>
      <p className="v2-mono text-[11px] text-muted-foreground">
        {capability.owner} · last assessed {capability.lastAssessed}
      </p>
      {!quiet && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p><span className="font-medium text-foreground">Evidence: </span>{capability.evidence}</p>
          <p><span className="font-medium text-foreground">Blocker: </span>{capability.blocker}</p>
          <p><span className="font-medium text-foreground">Required action: </span>{capability.action}</p>
        </div>
      )}
      {quiet && <p className="text-xs text-muted-foreground">{capability.evidence}</p>}
      {capability.documentation && (
        <a className="inline-block text-xs underline underline-offset-4" href={capability.documentation} target="_blank" rel="noreferrer">
          Documentation
        </a>
      )}
    </SubPanel>
  );
}

export default function PlatformReadiness() {
  useEffect(() => {
    document.title = 'Platform readiness | AURA DC';
  }, []);

  const clusters = CLUSTER_ORDER.map((cluster) => ({
    cluster,
    items: CAPABILITIES.filter((c) => clusterOf(truthStateOf(c.status)) === cluster),
  })).filter((group) => group.items.length > 0);

  const blocked = CAPABILITIES.filter((c) => truthStateOf(c.status) === 'critical').length;
  const verified = CAPABILITIES.filter((c) => truthStateOf(c.status) === 'live').length;
  const partial = CAPABILITIES.length - blocked - verified;

  return (
    <div className="min-w-0 space-y-5 pb-10" data-testid="platform-readiness-page">
      <CommandHeader
        eyebrow="Operations · Readiness control board"
        title={
          <span className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" aria-hidden />
            Platform readiness
          </span>
        }
        meta={
          <ProvenanceBadgeV2
            state={blocked > 0 ? 'critical' : verified === CAPABILITIES.length ? 'live' : 'simulated'}
            label={blocked > 0 ? `${blocked} blocking gaps` : 'No blocking gap recorded'}
          />
        }
        subtitle={
          <>
            Capability, deployment and runtime-readiness evidence. This is not a list of configured customer systems.
            For operational connection management see{' '}
            <Link className="underline underline-offset-4" to="/manage/integrations">
              Connections
            </Link>
            .
          </>
        }
      />

      <InstrumentGrid className="grid-cols-2 lg:grid-cols-4">
        <Instrument level="primary" state={blocked > 0 ? 'critical' : 'neutral'} label="Blocked domains" value={blocked} detail="No runtime evidence; not available." />
        <Instrument level="secondary" state="simulated" label="Partially verified" value={partial} detail="Evidence exists but is incomplete." />
        <Instrument level="secondary" state={verified > 0 ? 'verified' : 'neutral'} label="Verified" value={verified} detail="Runtime evidence recorded." />
        <Instrument level="secondary" label="Last assessment" value={<span className="v2-mono text-lg">{LAST_ASSESSED}</span>} detail="Applies to every capability row." />
      </InstrumentGrid>

      <section aria-labelledby="capabilities-heading" className="space-y-3">
        <h2 id="capabilities-heading" className="text-base font-semibold">Capability assessment</h2>
        {clusters.map((group) => (
          <Panel key={group.cluster} className="min-w-0">
            <SectionHeader
              title={group.cluster}
              actions={<span className="v2-mono text-xs text-muted-foreground">{group.items.length}</span>}
            />
            <div className={group.cluster === 'Verified' ? 'grid grid-cols-1 gap-2 lg:grid-cols-2' : 'grid grid-cols-1 gap-2'}>
              {group.items.map((c) => (
                <CapabilityRow key={c.domain} capability={c} quiet={group.cluster === 'Verified'} />
              ))}
            </div>
          </Panel>
        ))}
      </section>


      <section aria-labelledby="connector-capability-heading" className="space-y-3">
        <div className="space-y-1">
          <h2 id="connector-capability-heading" className="text-base font-semibold">Integration runtime capability</h2>
          <p className="text-sm text-muted-foreground">
            Engineering-level implementation class, binding eligibility and disclosure limits. A supported or linked
            connector here is not proof of a configured customer connection or active data flow.
          </p>
        </div>
        <ManagedConnectorInventory />
      </section>

      <NvidiaDsxReadinessPanel />

      <section aria-labelledby="dsx-exchange-heading" className="space-y-3">
        <h2 id="dsx-exchange-heading" className="text-base font-semibold">DSX exchange environment</h2>
        <DsxExchangeTab />
      </section>

      <section aria-labelledby="agent-tools-heading" className="space-y-3">
        <h2 id="agent-tools-heading" className="text-base font-semibold">Agent tool readiness</h2>
        <AgentToolsTab />
      </section>
    </div>
  );
}
