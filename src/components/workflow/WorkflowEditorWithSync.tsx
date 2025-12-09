import { useEffect } from 'react';
import { WorkflowEditor } from './WorkflowEditor';
import { useWorkflowSync } from '@/hooks/useWorkflowSync';

interface WorkflowEditorWithSyncProps {
  systemId: string | null;
}

/**
 * Wrapper around WorkflowEditor that adds automatic workflow sync
 * when integrations or MCP servers are connected
 */
export function WorkflowEditorWithSync({ systemId }: WorkflowEditorWithSyncProps) {
  // This hook listens for builder:catalog:updated events
  useWorkflowSync(systemId);

  return <WorkflowEditor />;
}
