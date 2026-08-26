/**
 * Latest activation/runtime evidence for one system.
 *
 * Reads the canonical `deployments` row plus its immutable event log. An
 * `active` database row is not treated as proof that an external runtime was
 * provisioned or is healthy. Runtime truth comes from runtime URL + health
 * evidence through `classifyDeploymentTruth`.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard, WorkspaceEmptyState } from '@/components/workspace-system';
import { supabase } from '@/integrations/supabase/client';
import {
  classifyDeploymentTruth,
  deploymentTruthLabel,
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
    void (async () => {
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
    return () => { cancelled = true; };
  }, [systemId]);

  const failedSteps = events.filter((event) => event.status === 'failed').length;
  const truth = record ? classifyDeploymentTruth(record) : null;

  return (
    <SectionCard
      title="Activation evidence"
      icon={ShieldCheck}
      description="Latest recorded AURA activation and runtime evidence. Activation History holds the complete event record."
      className="mb-6"
      data-testid="deployment-evidence"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/deployments">
            Open Activation History
            <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      }
    >
      {loading ? (
        <p className="text-[13px] text-muted-foreground">Loading recorded activation evidence...</p>
      ) : failed ? (
        <WorkspaceEmptyState
          icon={ShieldCheck}
          title="Activation evidence could not be read"
          status="UNAVAILABLE"
          description="The activation record could not be loaded. Retry before making any runtime claim."
        />
      ) : !record ? (
        <WorkspaceEmptyState
          icon={ShieldCheck}
          title="No activation recorded for this system"
          status="NOT YET RECORDED"
          description="Evidence appears after the first Activate in AURA transaction."
        />
      ) : (
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Truth state</dt>
            <dd className="mt-1 text-sm font-semibold">{truth ? deploymentTruthLabel(truth) : 'Unavailable'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Recorded</dt>
            <dd className="mt-1 text-sm font-medium">{formatWhen(record.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Runtime URL</dt>
            <dd className="mt-1 text-sm font-medium">{record.runtime_url ? 'Recorded' : 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Runtime health</dt>
            <dd className="mt-1 text-sm font-medium">{record.health ?? 'Not measured'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Activation id</dt>
            <dd className="mt-1 truncate font-mono text-[12px]" title={record.id}>{record.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Event evidence</dt>
            <dd className="mt-1 text-sm font-medium">
              {events.length === 0 ? 'No events recorded' : `${events.length} events, ${failedSteps} failed`}
            </dd>
          </div>
          <div className="col-span-2">
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
