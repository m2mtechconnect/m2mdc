import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useManagedConnectorCapabilities } from '@/connections/managedConnectorApi';
import { ELIGIBILITY_LABEL } from '@/connections/managedConnectors';

/**
 * Agent-owned knowledge-source readiness.
 *
 * Workspace Documents is deliberately not an operational Connections entry.
 * This surface reports server-owned capability evidence only. It never offers
 * authorization until the project has a configured per-user connector client.
 */
export function KnowledgeSourceReadiness() {
  const capabilities = useManagedConnectorCapabilities();
  const workspaceDocuments = capabilities.data?.entries.find(
    (entry) => entry.connector_definition_id === 'workspace_documents',
  ) ?? null;

  if (capabilities.isLoading) {
    return <Skeleton className="h-36 w-full rounded-lg" />;
  }

  return (
    <Card data-testid="knowledge-source-readiness">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Knowledge sources
        </CardTitle>
        <CardDescription>
          Knowledge and grounding sources are governed with agent policy, not treated as facility or operational connections.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Workspace documents</p>
            <Badge variant="outline" className="text-xs">
              {workspaceDocuments ? ELIGIBILITY_LABEL[workspaceDocuments.eligibility] : 'Not assessed'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {workspaceDocuments?.evidence_note
              ?? 'The server did not return verified capability evidence for this knowledge source.'}
          </p>
          {workspaceDocuments && !workspaceDocuments.user_client_configured && (
            <p className="mt-2 text-xs text-muted-foreground">
              No managed connector client is configured for this project, so user authorization is unavailable. No document access is implied.
            </p>
          )}
          {workspaceDocuments?.user_binding && (
            <p className="mt-2 text-xs text-muted-foreground">
              Binding state: {workspaceDocuments.user_binding.status}. This state alone does not prove that documents were ingested or used for grounding.
            </p>
          )}
        </div>

        <Link
          to="/admin/platform-readiness"
          className="inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-4"
        >
          Review integration runtime capability
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
