/**
 * Deployment Summary Card
 * Shows full configuration summary from live twin data
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Brain, Plug, GitBranch, Settings, Shield, User, Clock
} from 'lucide-react';

interface DeploymentSummaryCardProps {
  builderState: any;
  governanceConfig: any;
  currentVersion: string;
}

export function DeploymentSummaryCard({
  builderState,
  governanceConfig,
  currentVersion
}: DeploymentSummaryCardProps) {
  const sections = [
    {
      title: 'Overview',
      icon: FileText,
      items: [
        { label: 'Name', value: builderState?.goal || 'Untitled Agent' },
        { label: 'Category', value: builderState?.type || 'agent' },
        { label: 'Industry', value: builderState?.industry || 'Not specified' },
        { label: 'Department', value: builderState?.department || 'Not specified' },
      ]
    },
    {
      title: 'Intelligence',
      icon: Brain,
      items: [
        { label: 'Model', value: builderState?.modelConfig?.model || 'Not configured' },
        { label: 'Provider', value: builderState?.modelConfig?.provider || 'google' },
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
    {
      title: 'Runtime',
      icon: Settings,
      items: [
        { label: 'Environment', value: 'Development' },
        { label: 'Version', value: currentVersion || '1.0.0' },
        { label: 'Owner', value: 'Current User' },
        { label: 'Last Modified', value: new Date().toLocaleDateString() },
      ]
    },
    {
      title: 'Governance',
      icon: Shield,
      items: [
        { label: 'Access Control', value: governanceConfig?.accessControl || 'Default' },
        { label: 'Audit Enabled', value: governanceConfig?.auditEnabled ? 'Yes' : 'Yes (default)' },
        { label: 'Data Classification', value: governanceConfig?.dataClassification || 'Internal' },
        { label: 'Compliance Tags', value: governanceConfig?.tags?.join(', ') || 'None' },
      ]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Configuration Summary</CardTitle>
          <Badge variant="outline">v{currentVersion || '1.0.0'}</Badge>
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
