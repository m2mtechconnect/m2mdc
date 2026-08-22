import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Box,
  Check,
  ChevronDown,
  CloudCog,
  Cpu,
  Database,
  GitBranch,
  Layers3,
  Network,
  Plug,
  ServerCog,
  Shield,
  Sparkles,
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
import { useConnectorDefinitions } from '@/connections/api';
import { useManagedConnectorCapabilities } from '@/connections/managedConnectorApi';
import { CONNECTION_CLASS_LABEL, ELIGIBILITY_LABEL, type ManagedCapabilityEntry } from '@/connections/managedConnectors';
import type { ConnectorDefinition } from '@/connections/model';

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

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isManagedEntry(entry: ManagedCapabilityEntry): boolean {
  return entry.connection_class === 'MANAGED_SHARED' || entry.connection_class === 'MANAGED_USER';
}

export function Step3Tools() {
  const { tools, setTools, isLoading } = useWizardBuilderStore();
  const { currentBlueprint } = useBlueprintStore();
  const definitionsQuery = useConnectorDefinitions();
  const managedQuery = useManagedConnectorCapabilities();
  const [initialized, setInitialized] = useState(false);

  const definitions = definitionsQuery.data ?? [];
  const definitionsById = useMemo(() => new Map(definitions.map((definition) => [definition.id, definition])), [definitions]);
  const managedEntries = useMemo(() => (managedQuery.data?.entries ?? []).filter(isManagedEntry), [managedQuery.data?.entries]);
  const recommendedNames = currentBlueprint?.tools?.preselectedIntegrations ?? currentBlueprint?.tools?.recommendedIntegrations ?? [];

  const recommendedTools = useMemo(() => {
    const resolved: BuilderTool[] = [];
    for (const requestedName of recommendedNames) {
      const normalized = normalizeName(requestedName);
      const managed = managedEntries.find((entry) => {
        const definition = definitionsById.get(entry.connector_definition_id);
        return Boolean(definition) && (normalizeName(definition!.name) === normalized || normalizeName(definition!.id) === normalized);
      });
      if (managed) {
        const definition = definitionsById.get(managed.connector_definition_id);
        if (definition) resolved.push(toManagedBuilderTool(managed, definition));
        continue;
      }
      const native = AURA_NATIVE_CAPABILITIES.find((capability) => normalizeName(capability.name) === normalized || normalizeName(capability.id) === normalized);
      if (native) resolved.push(toNativeBuilderTool(native));
    }
    return resolved;
  }, [definitionsById, managedEntries, recommendedNames]);

  useEffect(() => {
    if (initialized || tools.length > 0) return;
    if (recommendedTools.length > 0) void setTools(recommendedTools);
    setInitialized(true);
  }, [initialized, recommendedTools, setTools, tools.length]);

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
        title="Connections"
        subtitle="Start with recommendations for this build, then browse the full approved capability catalogue if needed."
        icon={<Plug className="h-5 w-5" />}
      />

      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Selecting a capability adds it to the design only. It does not mean the capability is authenticated, connected, healthy or moving data. Runtime truth remains evidence-derived in AURA Connections.
      </div>

      <DCCard
        title="Recommended for this build"
        subtitle={recommendedTools.length > 0 ? 'Recommendations come from the current blueprint and remain subject to runtime eligibility.' : 'No blueprint-specific connection recommendations are available yet.'}
        icon={<Sparkles className="h-4 w-4" />}
      >
        {recommendedTools.length > 0 ? (
          <div className="space-y-3">
            {recommendedTools.map((tool) => {
              const managedEntry = managedEntries.find((entry) => entry.connector_definition_id === tool.id);
              const native = AURA_NATIVE_CAPABILITIES.find((entry) => entry.id === tool.id);
              const disabled = isLoading || Boolean(managedEntry && !managedEntry.runtime_selectable);
              return (
                <CapabilityRow
                  key={tool.id}
                  icon={managedEntry ? <CloudCog className="h-4 w-4" aria-hidden /> : <Cpu className="h-4 w-4" aria-hidden />}
                  name={tool.name}
                  description={native?.description ?? (managedEntry ? managedDescription(definitionsById.get(tool.id)!, managedEntry) : 'Recommended AURA capability.')}
                  runtime={managedEntry ? CONNECTION_CLASS_LABEL[managedEntry.connection_class] : 'AURA Native'}
                  availability={managedEntry ? ELIGIBILITY_LABEL[managedEntry.eligibility] : undefined}
                  selected={selectedIds.has(tool.id)}
                  disabled={disabled}
                  onToggle={() => void toggleTool(tool)}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Continue with the approved capability catalogue below. AURA will not invent recommendations when the blueprint has none.
          </div>
        )}
      </DCCard>

      <details className="group rounded-lg border border-border bg-muted/20" open={recommendedTools.length === 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-semibold">Browse all approved capabilities</p>
            <p className="mt-1 text-xs text-muted-foreground">Physical & OT, managed, automation and administrator-approved custom capabilities.</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        </summary>

        <div className="border-t border-border p-4">
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
                <DCCard key={category} title={category} subtitle={nativeCategorySubtitle(category)} icon={<Cpu className="h-4 w-4" />}>
                  <div className="space-y-3">
                    {AURA_NATIVE_CAPABILITIES.filter((capability) => capability.category === category).map((capability) => {
                      const selected = selectedIds.has(capability.id);
                      const Icon = capability.icon;
                      return (
                        <CapabilityRow key={capability.id} icon={<Icon className="h-4 w-4" aria-hidden />} name={capability.name} description={capability.description} runtime="AURA Native" selected={selected} disabled={isLoading} onToggle={() => void toggleTool(toNativeBuilderTool(capability))} />
                      );
                    })}
                  </div>
                </DCCard>
              ))}
            </TabsContent>

            <TabsContent value="managed" className="mt-6 space-y-4">
              <DCCard title="AURA Managed Connectors" subtitle="Server-owned capability inventory. Connection and authorization state are not inferred in the browser." icon={<CloudCog className="h-4 w-4" />}>
                {managedQuery.isLoading || definitionsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading approved managed capabilities…</p>
                ) : managedEntries.length > 0 ? (
                  <div className="space-y-3">
                    {managedEntries.map((entry) => {
                      const definition = definitionsById.get(entry.connector_definition_id);
                      if (!definition) return null;
                      return (
                        <CapabilityRow key={entry.connector_definition_id} icon={<CloudCog className="h-4 w-4" aria-hidden />} name={definition.name} description={managedDescription(definition, entry)} runtime={CONNECTION_CLASS_LABEL[entry.connection_class]} availability={ELIGIBILITY_LABEL[entry.eligibility]} selected={selectedIds.has(entry.connector_definition_id)} disabled={isLoading || !entry.runtime_selectable} onToggle={() => void toggleTool(toManagedBuilderTool(entry, definition))} />
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">No server-verified managed connector inventory is available for this session. Nothing is selectable until the project binding is verified.</p>
                    {AURA_MANAGED_CAPABILITIES.filter((capability) => capability.category !== 'automation').map((capability) => (
                      <CapabilityRow key={capability.id} icon={<CloudCog className="h-4 w-4" aria-hidden />} name={capability.name} description={capability.description} runtime={customerFacingRuntimeLabel(capability.runtime)} availability="Not verified" selected={false} disabled onToggle={() => undefined} />
                    ))}
                  </div>
                )}
              </DCCard>
              <ControlPlaneLink />
            </TabsContent>

            <TabsContent value="automation" className="mt-6 space-y-4">
              <DCCard title="AURA Automation" subtitle="Optional automation runtimes can execute approved workflows. Catalogue availability never implies a live runtime connection." icon={<Workflow className="h-4 w-4" />}>
                <div className="space-y-3">
                  {AURA_MANAGED_CAPABILITIES.filter((capability) => capability.category === 'automation').map((capability) => (
                    <CapabilityRow key={capability.id} icon={<Workflow className="h-4 w-4" aria-hidden />} name={capability.name} description={capability.description} runtime={customerFacingRuntimeLabel(capability.runtime)} availability={availabilityLabel(capability)} selected={selectedIds.has(capability.id)} disabled={isLoading} onToggle={() => void toggleTool(toCatalogBuilderTool(capability))} />
                  ))}
                </div>
              </DCCard>
              <ControlPlaneLink />
            </TabsContent>

            <TabsContent value="custom" className="mt-6">
              <DCCard title="Approved custom connectors" subtitle="Administrators provision endpoints, credentials, allowed hosts, methods, data contracts and audit policy outside the Builder." icon={<Shield className="h-4 w-4" />}>
                <div className="rounded-lg border border-border bg-muted/30 p-5">
                  <p className="text-sm font-medium">No raw endpoint or secret entry in Builder</p>
                  <p className="mt-1 text-sm text-muted-foreground">Builder users select approved connectors only. Administrators create and verify custom connectors through AURA Connections first.</p>
                  <Button variant="outline" className="mt-4" asChild><Link to="/manage/integrations?tab=catalogue">Open Connections</Link></Button>
                </div>
              </DCCard>
            </TabsContent>
          </Tabs>
        </div>
      </details>
    </div>
  );
}

function CapabilityRow({ icon, name, description, runtime, availability, selected, disabled, onToggle }: { icon: ReactNode; name: string; description: string; runtime: string; availability?: string; selected: boolean; disabled: boolean; onToggle: () => void }) {
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
      <Button type="button" size="sm" variant={selected ? 'outline' : 'default'} disabled={disabled} onClick={onToggle} className="sm:w-24">
        {selected ? <><Check className="mr-1.5 h-4 w-4" aria-hidden />Selected</> : disabled ? 'Unavailable' : 'Select'}
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
          <p className="text-xs text-muted-foreground">Use Connections for credentials, tenant scope, runtime health, data mappings and audit evidence.</p>
        </div>
        <Button variant="outline" asChild><Link to="/manage/integrations">Open Connections</Link></Button>
      </div>
    </div>
  );
}

function toManagedBuilderTool(entry: ManagedCapabilityEntry, definition: ConnectorDefinition): BuilderTool {
  return {
    id: definition.id,
    type: 'integration',
    name: definition.name,
    category: definition.category,
    enabled: true,
    connected: false,
    config: {
      runtime: 'aura_managed',
      connectionClass: entry.connection_class,
      eligibility: entry.eligibility,
      linkedToProject: entry.linked_to_project,
      runtimeSelectable: entry.runtime_selectable,
    },
  };
}

function toCatalogBuilderTool(capability: AuraManagedCapability): BuilderTool {
  return {
    id: capability.id,
    type: 'integration',
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

function managedDescription(definition: ConnectorDefinition, entry: ManagedCapabilityEntry): string {
  const classes = definition.supported_data_classes.slice(0, 3).join(', ');
  const scope = entry.connection_class === 'MANAGED_USER' ? 'User-authorized managed capability.' : 'Shared AURA-managed capability.';
  return classes ? `${scope} Approved data classes: ${classes}.` : scope;
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
