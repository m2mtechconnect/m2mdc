import { Badge } from '@/components/ui/badge';
import { DCCard } from '@/components/dc-ui';
import { intelligenceProfileForModel } from '@/config/auraRuntimeCatalog';
import { Activity, Brain, Link2, ShieldCheck, Workflow } from 'lucide-react';

interface BuilderState {
  goal?: string;
  industry?: string;
  department?: string;
  type?: string | null;
  template?: string;
  workflow?: {
    triggers?: string[];
    actions?: string[];
    integrations?: string[];
    hitl?: string[];
  };
  modelConfig?: {
    provider?: string;
    model?: string;
    rag?: Record<string, unknown>;
    policies?: Record<string, unknown>;
  };
  kpis?: unknown[];
  connectors?: string[];
  webhooks?: unknown[];
}

interface GovernanceConfig {
  auditEnabled?: boolean | null;
  tags?: string[];
}

interface DeploymentSummaryCardProps {
  builderState: BuilderState;
  governanceConfig?: GovernanceConfig;
  currentVersion?: string | null;
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function DeploymentSummaryCard({
  builderState,
  governanceConfig,
  currentVersion,
}: DeploymentSummaryCardProps) {
  const profile = intelligenceProfileForModel(builderState.modelConfig?.model);
  const selectedCapabilities = builderState.connectors?.length ?? 0;
  const actionCount = builderState.workflow?.actions?.length ?? 0;
  const triggerCount = builderState.workflow?.triggers?.length ?? 0;
  const approvalGateCount = builderState.workflow?.hitl?.length ?? 0;
  const kpiCount = builderState.kpis?.length ?? 0;
  const governanceRecorded = typeof governanceConfig?.auditEnabled === 'boolean';

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DCCard title="Design summary" icon={<Activity className="h-4 w-4" />}>
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Objective</p>
            <p className="mt-1 text-sm font-medium">{builderState.goal?.trim() || 'Not provided'}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Industry</p>
              <p className="text-sm font-medium">{builderState.industry || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="text-sm font-medium">{builderState.department || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Build type</p>
              <p className="text-sm font-medium">{builderState.type || 'Not selected'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Configuration version</p>
              <p className="text-sm font-medium">{currentVersion || 'No recorded snapshot'}</p>
            </div>
          </div>
        </div>
      </DCCard>

      <DCCard title="Intelligence" icon={<Brain className="h-4 w-4" />}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">AURA {profile.name}</Badge>
            <Badge variant="secondary">Design selection</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{profile.description}</p>
          <p className="text-xs text-muted-foreground">
            Builder selection does not prove provider connectivity or model-runtime health. Runtime readiness is verified separately by AURA control-plane evidence.
          </p>
        </div>
      </DCCard>

      <DCCard title="Workflow & capabilities" icon={<Workflow className="h-4 w-4" />}>
        <div className="divide-y divide-border">
          <CountRow label="Triggers configured" value={triggerCount} />
          <CountRow label="Actions configured" value={actionCount} />
          <CountRow label="Approval gates configured" value={approvalGateCount} />
          <CountRow label="Selected capabilities" value={selectedCapabilities} />
          <CountRow label="KPIs configured" value={kpiCount} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Selected capabilities are design references only. Connection, authentication, health and data-flow state come from Connections.
        </p>
      </DCCard>

      <DCCard title="Deployment control" icon={<ShieldCheck className="h-4 w-4" />}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Runtime status: Not verified here</Badge>
            <Badge variant="outline">Production activation: Server-authorized</Badge>
          </div>
          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
            <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-xs text-muted-foreground">
              Builder does not assert that this configuration is deployed, healthy, connected or live. Open the controlled deployment review to execute an authorized activation and record its result.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Governance configuration: {governanceRecorded ? (governanceConfig?.auditEnabled ? 'recorded as enabled' : 'recorded as disabled') : 'not independently verified in Builder'}.
          </p>
        </div>
      </DCCard>
    </div>
  );
}
