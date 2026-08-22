import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Box,
  Check,
  CloudCog,
  Cpu,
  Database,
  GitBranch,
  Layers3,
  Network,
  Plug,
  ServerCog,
  Shield,
  Workflow,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWizardBuilderStore, type BuilderTool } from '@/stores/wizardBuilderStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { toast } from 'sonner';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';
import {
  AURA_MANAGED_CAPABILITIES,
  customerFacingRuntimeLabel,
  type AuraManagedCapability,
} from '@/config/auraRuntimeCatalog';

interface NativeCapability {
  id: string;
  name: string;
  category: 'Facility & OT' | 'Physical AI' | 'Observability' | 'Twin & Storage';
  description: string;
  icon: typeof Plug;
}

const AURA_NATIVE_CAPABILITIES: readonly NativeCapability[] = [
  { id: 'bacnet_ip', name: 'BACnet/IP', category: 'Facility & OT', description: 'Building automation and facility telemetry.', icon: Network },
  { id: 'modbus_tcp', name: 'Modbus TCP', category: 'Facility & OT', description: 'Industrial equipment and metering telemetry.', icon: Network },
  { id: 'opcua', name: 'OPC-UA', category: 'Facility & OT', description: 'Industrial data and equipment interoperability.', icon: ServerCog },
  { id: 'snmp', name: 'SNMP', category: 'Facility & OT', description: 'Infrastructure and network device telemetry.', icon: Activity },
  { id: 'dcim_rest', name: 'DCIM', category: 'Facility & OT', description: 'Data-centre infrastructure management data and operations.', icon: Database },
  { id: 'redfish', name: 'Redfish', category: 'Physical AI', description: 'Hardware management and equipment-state integration.', icon: Cpu },
  { id: 'nvidia_dcgm', name: 'GPU Telemetry', category: 'Physical AI', description: 'GPU health, utilization and workload telemetry.', icon: Cpu },
  { id: 'dsx_ingest_gateway', name: 'DSX Ingest Gateway', category: 'Physical AI', description: 'Governed exchange path for approved facility and evidence data.', icon: GitBranch },
  { id: 'dsx_exchange', name: 'DSX Exchange', category: 'Physical AI', description: 'Optional NVIDIA DSX exchange capability when deployed and verified.', icon: GitBranch },
  { id: 'mqtt_transport', name: 'MQTT', category: 'Facility & OT', description: 'Event and telemetry transport for edge-connected systems.', icon: Network },
  { id: 'prometheus', name: 'Prometheus', category: 'Observability', description: 'Operational metrics and time-series monitoring.', icon: BarChart3 },
  { id: 'prometheus_otel', name: 'OpenTelemetry', category: 'Observability', description: 'Metrics, traces and telemetry exchange.', icon: Activity },
  { id: 'grafana', name: 'Grafana', category: 'Observability', description: 'Operational visualization and observability context.', icon: BarChart3 },
  { id: 'openusd_storage', name: 'OpenUSD Assets', category: 'Twin & Storage', description: 'Digital-twin assets, layers and scene data.', icon: Box },
  { id: 'ddn_infinia', name: 'DDN Infinia', category: 'Twin & Storage', description: 'Target evidence and object-storage integration when deployed.', icon: Layers3 },
];

const MANAGED_GROUPS = [
  { id: 'business_app', label: 'Business Apps' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'data_platform', label: 'Data Platforms' },
] as const;

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function Step3Tools() {
  const { tools, setTools, isLoading } = useWizardBuilderStore();
  const { currentBlueprint } = useBlueprintStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || tools.length > 0) return;
    const recommended = currentBlueprint?.tools?.preselectedIntegrations
      ?? currentBlueprint?.tools?.recommendedIntegrations
      ?? [];

    if (recommended.length > 0) {
      const selected: BuilderTool[] = [];
      for (const requestedName of recommended) {
        const normalized = normalizeName(requestedName);
        const managed = AURA_MANAGED_CAPABILITIES.find((capability) =>
          normalizeName(capability.name) === normalized || normalizeName(capability.id) === normalized,
        );
        if (managed) {
          selected.push(toBuilderTool(managed));
          continue;
        }
        const native = AURA_NATIVE_CAPABILITIES.find((capability) =>
          normalizeName(capability.name) === normalized || normalizeName(capability.id) === normalized,
        );
        if (native) selected.push(toNativeBuilderTool(native));
      }
      if (selected.length > 0) void setTools(selected);
    }
    setInitialized(true);
  }, [currentBlueprint, initialized, setTools, tools.length]);

  const selectedIds = useMemo(() => new Set(tools.map((tool) => tool.id)), [tools]);

  async function toggleTool(tool: BuilderTool) {
    const selected = selectedIds.has(tool.id);
    const next = selected ? tools.filter((existing) => existing.id !== tool.id) : [...tools, tool];
    try {
      await setTools(next);
      toast.success(selected ? `Removed ${tool.name}` : `Selected ${tool.name}`);
    } catch {
      toast.error('Could not update the selected capability');
    }
  }

  const managedSelected = tools.filter((tool) => tool.config?.runtime === 'aura_managed').length;
  const nativeSelected = tools.filter((tool) => tool.config?.runtime === 'aura_native').length;
  const automationSelected = tools.filter((tool) => tool.config?.runtime === 'automation').length;

  return (
    <div className="mx-auto max-w-[920px] space-y-6">
      <DCSectionHeader
        title="Tools & Connections"
        subtitle="Select approved AURA capabilities. Runtime authorization and health remain governed in AURA Connections."
        icon={<Plug className="h-5 w-5" />}
      />

      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Selecting a capability here adds it to the system design. It does not claim the capability is authenticated, connected, healthy or moving data. Runtime truth remains evidence-derived in AURA Connections.
      </div>

      <Tabs defaultValue="native" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="native" className="gap-2">
            <Cpu className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Physical & OT</span>
            {nativeSelected > 0 && <Badge variant="secondary">{nativeSelected}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="managed" className="gap-2">
            <CloudCog className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Managed</span>
            {managedSelected > 0 && <Badge variant="secondary">{managedSelected}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Workflow className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Automation</span>
            {automationSelected > 0 && <Badge variant="secondary">{automationSelected}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <Shield className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Custom</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="native" className="mt-6 space-y-6">
          {(['Facility & OT', 'Physical AI', 'Observability', 'Twin & Storage'] as const).map((category) => (
            <DCCard
              key={category}
              title={category}
              subtitle={nativeCategorySubtitle(category)}
              icon={<Cpu className="h-4 w-4" />}
            >
              <div className="space-y-3">
                {AURA_NATIVE_CAPABILITIES.filter((capability) => capability.category === category).map((capability) => {
                  const selected = selectedIds.has(capability.id);
                  const Icon = capability.icon;
                  return (
                    <CapabilityRow
                      key={capability.id}
                      icon={<Icon className="h-4 w-4" aria-hidden />}
                      name={capability.name}
                      description={capability.description}
                      runtime="AURA Native"
                      selected={selected}
                      disabled={isLoading}
                      onToggle={() => void toggleTool(toNativeBuilderTool(capability))}
                    />
                  );
                })}
              </div>
            </DCCard>
          ))}
        </TabsContent>

        <TabsContent value="managed" className="mt-6 space-y-6">
          {MANAGED_GROUPS.map((group) => {
            const capabilities = AURA_MANAGED_CAPABILITIES.filter((capability) => capability.category === group.id);
            if (capabilities.length === 0) return null;
            return (
              <DCCard
                key={group.id}
                title={group.label}
                subtitle="Managed capability with AURA-owned policy, tenant scope and evidence semantics."
                icon={<CloudCog className="h-4 w-4" />}
              >
                <div className="space-y-3">
                  {capabilities.map((capability) => (
                    <CapabilityRow
                      key={capability.id}
                      icon={<CloudCog className="h-4 w-4" aria-hidden />}
                      name={capability.name}
                      description={capability.description}
                      runtime={customerFacingRuntimeLabel(capability.runtime)}
                      availability={availabilityLabel(capability)}
                      selected={selectedIds.has(capability.id)}
                      disabled={isLoading}
                      onToggle={() => void toggleTool(toBuilderTool(capability))}
                    />
                  ))}
                </div>
              </DCCard>
            );
          })}
          <ControlPlaneLink />
        </TabsContent>

        <TabsContent value="automation" className="mt-6 space-y-4">
          <DCCard
            title="AURA Automation"
            subtitle="Optional automation runtimes can execute approved workflows; availability is not the same as a live connection."
            icon={<Workflow className="h-4 w-4" />}
          >
            <div className="space-y-3">
              {AURA_MANAGED_CAPABILITIES.filter((capability) => capability.category === 'automation').map((capability) => (
                <CapabilityRow
                  key={capability.id}
                  icon={<Workflow className="h-4 w-4" aria-hidden />}
                  name={capability.name}
                  description={capability.description}
                  runtime={customerFacingRuntimeLabel(capability.runtime)}
                  availability={availabilityLabel(capability)}
                  selected={selectedIds.has(capability.id)}
                  disabled={isLoading}
                  onToggle={() => void toggleTool(toBuilderTool(capability))}
                />
              ))}
            </div>
          </DCCard>
          <ControlPlaneLink />
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <DCCard
            title="Approved Custom Connectors"
            subtitle="Custom endpoints are provisioned by administrators so credentials, allowed hosts, methods, data contracts and audit policy remain server-side."
            icon={<Shield className="h-4 w-4" />}
          >
            <div className="rounded-lg border border-border bg-muted/30 p-5">
              <p className="text-sm font-medium">No raw endpoint or secret entry in the Builder</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Builder users select only approved connectors. Administrators create and verify custom connectors through the AURA Connections control plane before they can be activated here.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/manage/integrations?tab=catalogue">Open AURA Connections</Link>
              </Button>
            </div>
          </DCCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CapabilityRow({
  icon,
  name,
  description,
  runtime,
  availability,
  selected,
  disabled,
  onToggle,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  runtime: string;
  availability?: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center ${selected ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted">{icon}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{name}</p>
            <Badge variant="outline" className="text-[10px]">{runtime}</Badge>
            {availability && <Badge variant="secondary" className="text-[10px]">{availability}</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant={selected ? 'outline' : 'default'}
        disabled={disabled}
        onClick={onToggle}
        className="sm:w-24"
      >
        {selected ? <><Check className="mr-1.5 h-4 w-4" aria-hidden />Selected</> : 'Select'}
      </Button>
    </div>
  );
}

function ControlPlaneLink() {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Need to authorize or verify a connection?</p>
          <p className="text-xs text-muted-foreground">Use AURA Connections for credentials, tenant scope, runtime health, data mappings and audit evidence.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/manage/integrations">AURA Connections</Link>
        </Button>
      </div>
    </div>
  );
}

function toBuilderTool(capability: AuraManagedCapability): BuilderTool {
  return {
    id: capability.id,
    type: capability.category === 'automation' ? 'integration' : 'integration',
    name: capability.name,
    category: capability.category,
    enabled: true,
    connected: false,
    config: {
      runtime: capability.runtime,
      availability: capability.availability,
      requiresUserAuthorization: Boolean(capability.requiresUserAuthorization),
    },
  };
}

function toNativeBuilderTool(capability: NativeCapability): BuilderTool {
  return {
    id: capability.id,
    type: 'integration',
    name: capability.name,
    category: capability.category,
    enabled: true,
    connected: false,
    config: { runtime: 'aura_native' },
  };
}

function availabilityLabel(capability: AuraManagedCapability): string {
  if (capability.availability === 'available') return 'Available';
  if (capability.availability === 'requires_configuration') return 'Configuration required';
  return 'Planned';
}

function nativeCategorySubtitle(category: NativeCapability['category']): string {
  switch (category) {
    case 'Facility & OT': return 'Industrial and facility sources remain AURA-native and evidence-controlled.';
    case 'Physical AI': return 'Hardware, GPU and DSX integration boundaries controlled by AURA.';
    case 'Observability': return 'Metrics and telemetry integrations for runtime evidence.';
    case 'Twin & Storage': return 'Digital-twin assets and evidence-storage integration.';
  }
}
