import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UnifiedAgentPreview } from '@/components/agent-preview/UnifiedAgentPreview';
import { SystemRuntimePanel } from './SystemRuntimePanel';
import { SystemConfigTabs } from './SystemConfigTabs';
import { SystemSimulation } from './SystemSimulation';
import type { DeployedSystem } from '@/types/system';

export type TwinDetailsMode = 'template' | 'system';

interface TwinDetailsLayoutProps {
  mode: TwinDetailsMode;
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
  system?: DeployedSystem;
  onDeploy?: () => void;
  onRun?: () => void;
  onEdit?: () => void;
  onClone?: () => void;
  onArchive?: () => void;
}

/**
 * Shared template/system layout.
 * Missing system metrics are passed through as unavailable rather than being
 * converted to zero, which would falsely imply a measured value.
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
  const hasQuickActions = Boolean(onRun || onEdit || onClone || onArchive);

  return (
    <div className="space-y-6">
      <UnifiedAgentPreview
        agentId={system?.id}
        agentName={agentName}
        status={mode === 'system' ? system?.status : status}
        version={mode === 'system' ? system?.version : version}
        successRate={system?.successRate ?? undefined}
        totalRuns={system?.totalRuns ?? undefined}
        roi={system?.roi ?? undefined}
        connectedAppsCount={system?.connectedAppsCount ?? undefined}
        recentActivity={system?.recentActivity}
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

      {mode === 'system' && system && (
        <>
          {hasQuickActions && (
            <Card className="p-6">
              <h3 className="text-h4 font-semibold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                {onRun && <Button onClick={onRun}>Run System</Button>}
                {onEdit && <Button onClick={onEdit} variant="outline">Edit in Builder</Button>}
                {onClone && <Button onClick={onClone} variant="outline">Clone System</Button>}
                {onArchive && <Button onClick={onArchive} variant="outline">Archive</Button>}
              </div>
            </Card>
          )}

          <SystemSimulation system={system} />
          <SystemRuntimePanel system={system} />
          <SystemConfigTabs system={system} onEdit={onEdit} />
        </>
      )}
    </div>
  );
}
