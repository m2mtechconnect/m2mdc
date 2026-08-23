import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, History, MessageCircle, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { DCCard, DCSectionHeader, DCKPITile } from '@/components/dc-ui';
import { DeploymentSummaryCard } from '@/components/builder/step5/deploy/DeploymentSummaryCard';
import { buildSimulationHandoffUrl } from '@/simulation/handoff';

interface RecordedRun {
  id: string;
  status: string;
  createdAt: string;
  durationMs: number | null;
}

interface RecordedVersion {
  id: string;
  version: string;
  publishedAt: string;
}

export function Step5Deploy() {
  const {
    builderId,
    goal,
    industry,
    department,
    type,
    template,
    workflow,
    modelConfig,
    tools,
    setCurrentStep,
  } = useWizardBuilderStore();
  const navigate = useNavigate();
  const { openWithQuestion } = useCoPilotContext();
  const [runs, setRuns] = useState<RecordedRun[]>([]);
  const [versions, setVersions] = useState<RecordedVersion[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!builderId) {
      setRuns([]);
      setVersions([]);
      return;
    }

    const loadEvidence = async () => {
      setEvidenceLoading(true);
      try {
        const [runResult, versionResult] = await Promise.all([
          supabase
            .from('agent_runs')
            .select('id, status, created_at, duration_ms')
            .eq('agent_id', builderId)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('agent_versions')
            .select('id, version, published_at')
            .eq('agent_id', builderId)
            .order('published_at', { ascending: false })
            .limit(10),
        ]);
        if (cancelled) return;
        if (runResult.error) throw runResult.error;
        if (versionResult.error) throw versionResult.error;
        setRuns((runResult.data ?? []).map((run) => ({
          id: run.id,
          status: run.status,
          createdAt: run.created_at ?? '',
          durationMs: run.duration_ms ?? null,
        })));
        setVersions((versionResult.data ?? []).map((version) => ({
          id: version.id,
          version: version.version,
          publishedAt: version.published_at ?? '',
        })));
      } catch (error) {
        console.error('[BuilderReview] Failed to load recorded evidence:', error);
        if (!cancelled) {
          setRuns([]);
          setVersions([]);
        }
      } finally {
        if (!cancelled) setEvidenceLoading(false);
      }
    };

    void loadEvidence();
    return () => { cancelled = true; };
  }, [builderId]);

  const designChecks = useMemo(() => [
    { label: 'Objective', pass: Boolean(goal.trim()), step: 1 },
    { label: 'Industry and department', pass: Boolean(industry && department), step: 1 },
    { label: 'Build type', pass: Boolean(type), step: 1 },
    { label: 'AURA intelligence profile', pass: Boolean(modelConfig?.model), step: 2 },
    { label: 'Workflow actions', pass: Boolean(workflow?.actions?.length), step: 4 },
  ], [department, goal, industry, modelConfig?.model, type, workflow?.actions?.length]);

  const passedChecks = designChecks.filter((check) => check.pass).length;
  const blockers = designChecks.filter((check) => !check.pass);
  const currentVersion = versions[0]?.version ?? null;
  const completedRuns = runs.filter((run) => run.status === 'completed' || run.status === 'success').length;

  const builderState = {
    goal,
    industry,
    department,
    type,
    template,
    workflow,
    modelConfig,
    kpis: [],
    connectors: tools.filter((tool) => tool.type === 'integration').map((tool) => tool.name),
    webhooks: [],
  };

  const openDeploymentReview = () => {
    if (!builderId || blockers.length > 0) return;
    navigate(`/deploy?id=${encodeURIComponent(builderId)}`);
  };

  return (
    <div className="mx-auto max-w-[920px] space-y-6" data-testid="builder-deployment-review">
      <DCSectionHeader
        title="Review & Deployment Controls"
        subtitle="Review design completeness and recorded evidence before handing off to the server-authorized deployment workflow."
        icon={<Rocket className="h-5 w-5" />}
      />

      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Builder does not declare production readiness.</p>
            <p className="mt-1 text-muted-foreground">
              Design checks below are configuration completeness only. Connection health, runtime execution, deployment authorization and production release approval are verified independently.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DCKPITile
          label="Design checks"
          value={`${passedChecks}/${designChecks.length}`}
          sublabel="configuration only"
          status={blockers.length === 0 ? 'normal' : 'warning'}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <DCKPITile
          label="Recorded runs"
          value={String(runs.length)}
          sublabel={`${completedRuns} completed`}
          status={runs.length > 0 ? 'info' : 'warning'}
          icon={<History className="h-4 w-4" />}
        />
        <DCKPITile
          label="Configuration version"
          value={currentVersion ?? 'None'}
          sublabel="recorded snapshot"
          status={currentVersion ? 'info' : 'warning'}
          icon={<History className="h-4 w-4" />}
        />
        <DCKPITile
          label="Runtime status"
          value="Not verified"
          sublabel="verify after activation"
          status="info"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      {blockers.length > 0 && (
        <DCCard title="Configuration blockers" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="space-y-2">
            {blockers.map((blocker) => (
              <div key={blocker.label} className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 p-3">
                <span className="text-sm">{blocker.label}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(blocker.step)}>Fix in step {blocker.step}</Button>
              </div>
            ))}
          </div>
        </DCCard>
      )}

      <DeploymentSummaryCard
        builderState={builderState}
        governanceConfig={undefined}
        currentVersion={currentVersion}
      />

      <DCCard title="Recorded execution evidence" icon={<History className="h-4 w-4" />}>
        {evidenceLoading ? (
          <p className="text-sm text-muted-foreground">Loading recorded runs…</p>
        ) : runs.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">No execution run is recorded for this build. This does not block saving the design, but it is visible to the deployment reviewer.</p>
            {builderId && (
              <Button variant="outline" onClick={() => navigate(buildSimulationHandoffUrl({ blueprintId: builderId, returnTab: 'simulation' }))}>
                Open simulation
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {runs.slice(0, 5).map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{run.status}</Badge>
                  <span className="text-muted-foreground">{run.createdAt ? new Date(run.createdAt).toLocaleString() : 'Timestamp unavailable'}</span>
                </div>
                <span className="text-xs text-muted-foreground">{run.durationMs === null ? 'duration unavailable' : `${run.durationMs} ms`}</span>
              </div>
            ))}
          </div>
        )}
      </DCCard>

      <DCCard title="Controlled deployment handoff" icon={<ShieldCheck className="h-4 w-4" />}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The deployment page re-evaluates authorization and persisted configuration on the server. Builder state alone cannot activate a runtime or mark a system deployed.
          </p>
          <Button onClick={openDeploymentReview} disabled={!builderId || blockers.length > 0} className="gap-2">
            <Rocket className="h-4 w-4" aria-hidden />
            Open deployment review
          </Button>
        </div>
      </DCCard>

      <DCCard className="bg-muted/30">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">Ask AURA Assistant:</span>
          <Button variant="ghost" size="sm" onClick={() => openWithQuestion('Review this build configuration and identify missing evidence before deployment.')}>
            <MessageCircle className="mr-1 h-3 w-3" />Review evidence
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openWithQuestion('Identify operational and governance risks that should be reviewed before activating this build.')}>
            <MessageCircle className="mr-1 h-3 w-3" />Identify risks
          </Button>
        </div>
      </DCCard>
    </div>
  );
}
