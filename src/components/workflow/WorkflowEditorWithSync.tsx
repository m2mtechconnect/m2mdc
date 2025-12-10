import { useEffect } from 'react';
import { WorkflowEditor } from './WorkflowEditor';
import { useWorkflowSync } from '@/hooks/useWorkflowSync';
import { useActiveTwin } from '@/context/ActiveTwinContext';

interface WorkflowEditorWithSyncProps {
  systemId?: string | null;
}

/**
 * Wrapper around WorkflowEditor that adds automatic workflow sync
 * when integrations or MCP servers are connected.
 * Uses active twin from context if no systemId is provided.
 */
export function WorkflowEditorWithSync({ systemId }: WorkflowEditorWithSyncProps) {
  const { activeTwinId } = useActiveTwin();
  
  // Use provided systemId or fall back to activeTwinId
  const effectiveSystemId = systemId ?? activeTwinId;
  
  // This hook listens for builder:catalog:updated events
  useWorkflowSync(effectiveSystemId);

  return <WorkflowEditor />;
}
