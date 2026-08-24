/**
 * Latest deployment evidence for one system.
 *
 * Reads the canonical `deployments` row plus its immutable `deployment_events`
 * step log. This surface is a summary only: Runtime History (`/deployments`)
 * remains the canonical full evidence record. Nothing is written here and no
 * new evidence model is introduced.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard, WorkspaceEmptyState } from '@/components/workspace-system';
import { supabase } from '@/integrations/supabase/client';
import {
  listDeploymentEvents,
  type DeploymentEventRecord,
  type DeploymentRecord,
} from '@/workspace/deploymentRecords';

function formatWhen(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}

export function DeploymentEvidenceCard({ systemId }: { systemId: string }) {
  const [record, setRecord] = useState<DeploymentRecord | null>(null);
  const [events, setEvents] = useState<DeploymentEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const { data, error } = await supabase
          .from('deployments')
          .select('*')
          .eq('system_id', systemId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        const latest = (data ?? null) as DeploymentRecord | null;
        setRecord(latest);
        if (latest) {
          const log = await listDeploymentEvents(latest.id);
          if (!cancelled) setEvents(log);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [systemId]);

  const failedSteps = events.filter((event) => event.status === 'failed').length;

  return (
    <SectionCard
      title="Deployment evidence"
      icon={ShieldCheck}
      description="Latest recorded execution for this system. Runtime History holds the complete evidence record."
      className="mb-6"
      data-testid="deployment-evidence"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/deployments">
            Open Runtime History
            <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      }
    >
      {loading ? (
        <p className="text-[13px] text-muted-foreground">Loading recorded deployment evidence…</p>
      ) : failed ? (
        <WorkspaceEmptyState
          icon={ShieldCheck}
          title="Deployment evidence could not be read"
          status="UNAVAILABLE"
          description="The deployment record could not be loaded. Retry before treating this system as never deployed."
        />
      ) : !record ? (
        <WorkspaceEmptyState
          icon={ShieldCheck}
          title="No deployment recorded for this system"
          status="NOT YET RECORDED"
          description="Evidence appears here after the first deployment runs. Nothing has been executed for this system."
        />
      ) : (
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Outcome</dt>
            <dd className="mt-1 text-sm font-semibold">{record.status}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Executed</dt>
            <dd className="mt-1 text-sm font-medium">{formatWhen(record.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Deployment id</dt>
            <dd className="mt-1 truncate font-mono text-[12px]" title={record.id}>{record.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Step evidence</dt>
            <dd className="mt-1 text-sm font-medium">
              {events.length === 0
                ? 'No steps recorded'
                : `${events.length} steps · ${failedSteps} failed`}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Recorded health</dt>
            <dd className="mt-1 text-sm font-medium">{record.health ?? 'Not measured'}</dd>
          </div>
          <div className="lg:col-span-3">
            <dt className="text-xs font-medium text-muted-foreground">Reported error</dt>
            <dd className="mt-1 break-words text-sm text-muted-foreground">
              {record.error_message ?? 'None recorded'}
            </dd>
          </div>
        </dl>
      )}
    </SectionCard>
  );
}

export default DeploymentEvidenceCard;
