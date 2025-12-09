import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useBuilderSelectionStore } from '@/stores/builderSelectionStore';
import { normalizeIndustryAgent } from '@/lib/marketplaceNormalizer';
import { UnifiedAgentPreview } from '@/components/agent-preview/UnifiedAgentPreview';

interface IndustryAgentPreviewModalProps {
  agent: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (agentId: string) => void;
}

export function IndustryAgentPreviewModal({ agent, open, onOpenChange, onConnect }: IndustryAgentPreviewModalProps) {
  const navigate = useNavigate();
  const { setSelection, setNormalizedApp } = useBuilderSelectionStore();

  if (!agent) return null;

  const handleUseInBuilder = () => {
    const normalized = normalizeIndustryAgent(agent);
    setNormalizedApp(normalized);
    setSelection({
      originTab: 'industry',
      itemId: agent.id,
      itemVersion: agent.version || agent.updated_at,
      payload: agent,
      timestamp: Date.now(),
    });

    navigate(`/builder?stage=2&tab=industry&id=${agent.id}&v=${encodeURIComponent(agent.version || agent.updated_at || '')}`);
    onOpenChange(false);
    
    if (onConnect) {
      onConnect(agent.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[88vh] p-6">
          <UnifiedAgentPreview
            agentName={agent.name}
            status={agent.status || 'draft'}
            version={agent.version || 'v1.0'}
            successRate={agent.performance?.success_rate || 0}
            totalRuns={agent.performance?.total_runs || 0}
            roi={agent.performance?.roi_estimate || 0}
            recentActivity={[]}
            onDeploy={handleUseInBuilder}
            mode="preview"
            description={agent.short_description || agent.description}
            llmModel={agent.model_stack?.primary_model || "Gemini 2.5 Flash"}
            llmProvider={agent.model_stack?.provider || "Google"}
            temperature={agent.model_stack?.temperature || 0.7}
            mcpServers={agent.dependencies?.map((dep: string) => ({
              name: dep,
              provider: dep.includes('AWS') ? 'Amazon' : dep.includes('Azure') ? 'Microsoft' : 'Cloud Provider',
              category: 'Cloud',
              authType: 'API Key',
              endpoint: `https://api.${dep.toLowerCase().replace(/\s/g, '')}.com/v1`,
              verified: true,
            })) || []}
            toolsCount={agent.build_steps?.length || 35}
            resourcesCount={45}
            promptsCount={15}
            features={agent.features || [
              'Real-time data processing and analysis',
              'Integrates with enterprise APIs and data sources',
              'Provides actionable insights and predictions',
              'Verified by M2M for reliability',
            ]}
            setupInstructions={[
              'Click "Deploy New Version" to initialize this agent in production.',
              'Configure connected MCP servers and LLM credentials.',
              'Test connection and chat for live inference.',
            ]}
            compatibility={{
              mcpEnabled: true,
              llmCompatible: ['Gemini', 'OpenAI'],
              cloudReady: true,
              enterpriseSecure: true,
            }}
            lastUpdated={agent.updated_at}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
