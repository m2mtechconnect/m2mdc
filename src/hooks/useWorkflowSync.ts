import { useEffect } from 'react';
import { useBuilderStore } from '@/stores/builderStore';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to sync workflow palette when integrations/MCP servers are added
 * Listens for builder:catalog:updated events
 */
export function useWorkflowSync(systemId: string | null) {
  const state = useBuilderStore((s) => s.state);
  const setState = useBuilderStore((s) => s.setState);
  const { toast } = useToast();

  useEffect(() => {
    if (!systemId) return;

    const handleCatalogUpdate = (event: CustomEvent) => {
      const { type, id, name } = event.detail;
      console.log('Catalog updated:', { type, id, name });

      // Add new node to workflow if not already present
      const existingNodes = state.workflowNodes || [];
      const nodeExists = existingNodes.some(n => n.id === id);

      if (!nodeExists) {
        const newNode = {
          id,
          type: type === 'integration' ? 'connector' : 'mcp-tool',
          label: name,
          config: {},
          position: { x: 100 + existingNodes.length * 50, y: 100 },
        };

        setState({
          ...state,
          workflowNodes: [...existingNodes, newNode],
        });

        toast({
          title: 'Workflow updated',
          description: `${name} added to workflow palette`,
        });
      }
    };

    window.addEventListener('builder:catalog:updated', handleCatalogUpdate as EventListener);

    return () => {
      window.removeEventListener('builder:catalog:updated', handleCatalogUpdate as EventListener);
    };
  }, [systemId, state, setState, toast]);
}

/**
 * Emit catalog update event
 */
export function emitCatalogUpdate(type: 'integration' | 'mcp', id: string, name: string) {
  const event = new CustomEvent('builder:catalog:updated', {
    detail: { type, id, name },
  });
  window.dispatchEvent(event);
  console.log('Emitted catalog update:', { type, id, name });
}
