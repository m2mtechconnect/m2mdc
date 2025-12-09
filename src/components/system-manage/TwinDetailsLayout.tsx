import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedAgentPreview } from '@/components/agent-preview/UnifiedAgentPreview';
import { SystemRuntimePanel } from './SystemRuntimePanel';
import { SystemConfigTabs } from './SystemConfigTabs';
import { SystemSimulation } from './SystemSimulation';
import type { DeployedSystem } from '@/types/system';

export type TwinDetailsMode = 'template' | 'system';

interface TwinDetailsLayoutProps {
  mode: TwinDetailsMode;
  // Template data (always present)
  agentName: string;
  status?: string;
  version?: string;
  description?: string;
  llmModel?: string;
  llmProvider?: string;
  temperature?: number;
  mcpServers?: any[];
  toolsCount?: number;
  resourcesCount?: number;
  promptsCount?: number;
  features?: string[];
  setupInstructions?: string[];
  compatibility?: {
    mcpEnabled: boolean;
    llmCompatible: string[];
    cloudReady: boolean;
    enterpriseSecure: boolean;
  };
  // System-specific data (only in 'system' mode)
  system?: DeployedSystem;
  // Callbacks
  onDeploy?: () => void;
  onRun?: () => void;
  onEdit?: () => void;
  onClone?: () => void;
  onArchive?: () => void;
}

/**
 * Shared layout component for displaying template previews and deployed system details.
 * 
 * Template mode: Shows static template info with "Use template" action
 * System mode: Shows template info + runtime controls, metrics, logs, and configuration tabs
 */
export function TwinDetailsLayout({
  mode,
  agentName,
  status = 'draft',
  version = 'v1.0',
  description,
  llmModel,
  llmProvider,
  temperature,
  mcpServers,
  toolsCount,
  resourcesCount,
  promptsCount,
  features,
  setupInstructions,
  compatibility,
  system,
  onDeploy,
  onRun,
  onEdit,
  onClone,
  onArchive,
}: TwinDetailsLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Template Preview Section (shared by both modes) */}
      <UnifiedAgentPreview
        agentId={system?.id}
        agentName={agentName}
        status={mode === 'system' ? system?.status : status}
        version={mode === 'system' ? system?.version : version}
        successRate={system?.successRate || 0}
        totalRuns={system?.totalRuns || 0}
        roi={system?.roi || 0}
        connectedAppsCount={system?.connectedAppsCount || 0}
        recentActivity={system?.recentActivity || []}
        onDeploy={onDeploy}
        mode={mode === 'template' ? 'preview' : 'full'}
        description={description}
        llmModel={llmModel}
        llmProvider={llmProvider}
        temperature={temperature}
        mcpServers={mcpServers}
        toolsCount={toolsCount}
        resourcesCount={resourcesCount}
        promptsCount={promptsCount}
        features={features}
        setupInstructions={setupInstructions}
        compatibility={compatibility}
      />

      {/* System-Only Sections */}
      {mode === 'system' && system && (
        <>
          {/* Runtime Controls & Quick Actions */}
          <Card className="p-6">
            <h3 className="text-h4 font-semibold mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              {onRun && (
                <Button onClick={onRun} className="gap-2">
                  Run System
                </Button>
              )}
              {onEdit && (
                <Button onClick={onEdit} variant="outline" className="gap-2">
                  Edit in Builder
                </Button>
              )}
              {onClone && (
                <Button onClick={onClone} variant="outline" className="gap-2">
                  Clone System
                </Button>
              )}
              {onArchive && (
                <Button onClick={onArchive} variant="outline" className="gap-2">
                  Archive
                </Button>
              )}
            </div>
          </Card>

          {/* Simulation Section */}
          <SystemSimulation system={system} />

          {/* Live Metrics Snapshot */}
          <SystemRuntimePanel system={system} />

          {/* Configuration Tabs */}
          <SystemConfigTabs system={system} onEdit={onEdit} />
        </>
      )}
    </div>
  );
}
