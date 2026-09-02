/**
 * Deployment Summary Card
 * Shows full configuration summary from live twin data
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Brain, Plug, GitBranch, Settings, Shield, Building2
} from 'lucide-react';
import type { BuildKind } from '@/lib/builder/buildKind';

interface DeploymentSummaryCardProps {
  builderState: any;
  governanceConfig: any;
  currentVersion: string;
  productKind: BuildKind;
  twinId: string | null;
  updatedAt: string | null;
}

export function DeploymentSummaryCard({
  builderState,
  governanceConfig,
  currentVersion,
  productKind,
  twinId,
  updatedAt,
}: DeploymentSummaryCardProps) {
  const isFacilityProduct = productKind === '3d_twin' || productKind === 'process_twin';
  const overview = {
    title: 'Overview',
    icon: FileText,
    items: [
      { label: 'Name', value: builderState?.goal || (isFacilityProduct ? 'Untitled data-centre twin' : 'Untitled agent') },
      { label: 'Category', value: isFacilityProduct ? 'Data-centre digital twin' : productKind },
      { label: 'Industry', value: builderState?.industry || 'Not specified' },
      { label: 'Department', value: builderState?.department || 'Not specified' },
    ],
  };
  const runtime = {
    title: 'Record',
    icon: Settings,
    items: [
      { label: 'State', value: 'Draft review' },
      { label: 'Version', value: currentVersion || 'Unavailable' },
      { label: 'Owner', value: 'Unavailable' },
      { label: 'Last Modified', value: updatedAt ? new Date(updatedAt).toLocaleDateString() : 'Unavailable' },
    ],
  };
  const governance = {
    title: 'Governance',
    icon: Shield,
    items: [
      { label: 'Access Control', value: governanceConfig?.accessControl || 'Default' },
      { label: 'Audit Enabled', value: governanceConfig?.auditEnabled ? 'Yes' : 'No' },
      { label: 'Data Classification', value: governanceConfig?.dataClassification || 'Not specified' },
      { label: 'Compliance Tags', value: governanceConfig?.tags?.join(', ') || 'None' },
    ],
  };

  const agentSections = [
    overview,
    {
      title: 'Intelligence',
      icon: Brain,
      items: [
        { label: 'Response profile', value: builderState?.modelConfig?.response_profile || (builderState?.modelConfig?.model ? 'Legacy draft (provider-specific)' : 'Not configured') },
        { label: 'Execution', value: 'Managed by AURA' },
        { label: 'Temperature', value: builderState?.modelConfig?.temperature?.toString() || '0.7' },
        { label: 'RAG Enabled', value: builderState?.modelConfig?.rag?.enabled ? 'Yes' : 'No' },
      ]
    },
    {
      title: 'Tools & Integrations',
      icon: Plug,
      items: [
        { label: 'API Tools', value: builderState?.workflow?.integrations?.length?.toString() || '0' },
        { label: 'Connectors', value: builderState?.connectors?.length?.toString() || '0' },
        { label: 'Webhooks', value: builderState?.webhooks?.length?.toString() || '0' },
        { label: 'MCP Servers', value: builderState?.modelConfig?.mcp_servers?.length?.toString() || '0' },
      ]
    },
    {
      title: 'Workflows',
      icon: GitBranch,
      items: [
        { label: 'Actions', value: builderState?.workflow?.actions?.length?.toString() || '0' },
        { label: 'Triggers', value: builderState?.workflow?.triggers?.length?.toString() || '0' },
        { label: 'HITL Gates', value: builderState?.workflow?.hitl?.length?.toString() || '0' },
        { label: 'Automations', value: builderState?.workflow?.automations?.length?.toString() || 'None' },
      ]
    },
    runtime,
    governance,
  ];

  const facilitySections = [
    overview,
    {
      title: 'Facility scope',
      icon: Building2,
      items: [
        { label: 'Facility binding', value: twinId || 'Not bound' },
        { label: 'Evidence scope', value: twinId ? 'Bound facility only' : 'Unavailable until bound' },
        { label: 'Template', value: builderState?.template || 'Not specified' },
        { label: 'Simulation source', value: twinId ? 'Server-validated facility runs' : 'Unavailable' },
      ],
    },
    runtime,
    governance,
  ];
  const sections = isFacilityProduct ? facilitySections : agentSections;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Configuration Summary</CardTitle>
          <Badge variant="outline">{currentVersion ? `v${currentVersion}` : 'Version unavailable'}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">{section.title}</h4>
                </div>
                <div className="space-y-2 pl-6">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium truncate max-w-[150px]">{item.value}</span>
                    </div>
                  ))}
                </div>
                {idx < sections.length - 1 && idx % 2 === 1 && (
                  <Separator className="col-span-2 my-4" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
