/**
 * DC Architecture Diagram - Visual flow of data center systems
 */

import { Cpu, Wind, Zap, Network, Shield, GitBranch, ArrowRight, Database } from 'lucide-react';
import { DCCard } from './DCCard';
import { Badge } from '@/components/ui/badge';

interface ArchitectureNode {
  id: string;
  label: string;
  icon: typeof Cpu;
  color: NodeTone;
  items: string[];
}

/**
 * Static class map. Interpolated Tailwind classes (`bg-${color}/10`) are never
 * emitted by the JIT compiler, so tones must be spelled out literally.
 */
const NODE_TONES = {
  primary: { surface: 'bg-primary/10 border-primary/30', chip: 'bg-primary/20', icon: 'text-primary' },
  info: { surface: 'bg-info/10 border-info/30', chip: 'bg-info/20', icon: 'text-info' },
  success: { surface: 'bg-success/10 border-success/30', chip: 'bg-success/20', icon: 'text-success' },
  warning: { surface: 'bg-warning/10 border-warning/30', chip: 'bg-warning/20', icon: 'text-warning' },
} as const;

type NodeTone = keyof typeof NODE_TONES;

const architectureNodes: ArchitectureNode[] = [
  {
    id: 'gpu-cluster',
    label: 'GPU Cluster',
    icon: Cpu,
    color: 'primary',
    items: ['NVIDIA H100 Fleet', 'Training Workloads', 'Inference Queue'],
  },
  {
    id: 'cooling',
    label: 'Cooling System',
    icon: Wind,
    color: 'info',
    items: ['CRAC/CRAH Units', 'Chillers', 'Hot/Cold Aisles'],
  },
  {
    id: 'power',
    label: 'Power Distribution',
    icon: Zap,
    color: 'warning',
    items: ['PDUs', 'UPS Banks', 'Generator Backup'],
  },
  {
    id: 'network',
    label: 'Network Fabric',
    icon: Network,
    color: 'info',
    items: ['InfiniBand', 'Spine-Leaf', 'Firewall'],
  },
  {
    id: 'sovereignty',
    label: 'Sovereignty Layer',
    icon: Shield,
    color: 'success',
    items: ['Data Residency', 'Jurisdiction Tags', 'Compliance'],
  },
  {
    id: 'workflows',
    label: 'Automation',
    icon: GitBranch,
    color: 'primary',
    items: ['Event Triggers', 'HITL Approvals', 'Orchestration'],
  },
];

interface DCArchitectureDiagramProps {
  showJson?: boolean;
}

export function DCArchitectureDiagram({ showJson = false }: DCArchitectureDiagramProps) {
  const architectureJson = {
    gpuCluster: {
      hardware: ['NVIDIA H100 x 256', 'NVIDIA A100 x 128'],
      schedulers: ['Slurm', 'Kubernetes'],
      metrics: ['utilization', 'memory', 'power_draw'],
    },
    coolingSystem: {
      zones: 8,
      units: ['CRAC-01', 'CRAC-02', 'CRAC-03', 'CRAC-04'],
      setpoint: '22°C',
      deltaT: '10-12°C',
    },
    powerTopology: {
      redundancy: 'N+1',
      upsBanks: 2,
      generatorBackup: true,
      pduCount: 40,
    },
    sovereignty: {
      jurisdiction: 'CA-ON',
      dataResidency: 'Canadian',
      compliance: ['SOC2', 'ISO 27001'],
    },
    workflows: [
      'thermal_runaway_mitigation',
      'gpu_spike_throttle',
      'sovereignty_violation_alert',
      'carbon_shock_response',
    ],
  };

  return (
    <div className="space-y-6">
      {/* Flow Diagram */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
        {architectureNodes.map((node, idx) => {
          const IconComp = node.icon;
          const tone = NODE_TONES[node.color];
          return (
            <div key={node.id} className="flex items-center gap-2 flex-shrink-0">
              <div className={`p-3 rounded-lg border min-w-[140px] ${tone.surface}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded ${tone.chip}`}>
                    <IconComp className={`h-4 w-4 ${tone.icon}`} />
                  </div>
                  <span className="text-sm font-medium">{node.label}</span>
                </div>
                <div className="space-y-1">
                  {node.items.map((item, i) => (
                    <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              {idx < architectureNodes.length - 1 && (
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Integration Icons */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
        <span className="text-sm text-muted-foreground">Integrations:</span>
        <div className="flex flex-wrap gap-2">
          {['Prometheus', 'Grafana', 'Slurm', 'DCIM API', 'Energy Grid API', 'Carbon API'].map((integration) => (
            <Badge key={integration} variant="outline" className="bg-muted">
              <Database className="h-3 w-3 mr-1" />
              {integration}
            </Badge>
          ))}
        </div>
      </div>

      {/* JSON Preview */}
      {showJson && (
        <DCCard title="Architecture Configuration" icon={<Database className="h-4 w-4" />}>
          <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto max-h-[300px]">
            {JSON.stringify(architectureJson, null, 2)}
          </pre>
        </DCCard>
      )}
    </div>
  );
}
