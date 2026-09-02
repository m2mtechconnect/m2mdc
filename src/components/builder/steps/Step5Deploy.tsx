/**
 * Step 5 - Deployment Review & Readiness Gate
 * Data Centre Digital Twin deployment with preflight checks
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Sparkles, Loader2, Rocket, CheckCircle2, AlertTriangle, Server, Cloud, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DCCard, DCSectionHeader, DCKPITile, DCStatusBadge } from '@/components/dc-ui';
import { BlueprintReviewSection } from '@/components/blueprint';
import { buildSimulationHandoffUrl } from '@/simulation/handoff';
import { builderService } from '@/services/builderService';
import { evaluateBuilderActivationReadiness } from '../../../../supabase/functions/_shared/builderActivationReadiness';

import {
  ReadinessChecklist,
  DeploymentSummaryCard,
  SimulationPreviewPanel,
  AutoSuggestedKPIs,
  DeploymentWarnings,
  VersionSnapshot,
  DeploymentEnvironmentPipeline,
  GovernancePreviewPanel,
} from '@/components/builder/step5/deploy';

export function Step5Deploy() {
  const {
    builderId,
    goal, industry, department, type, template, workflow, modelConfig, tools,
    setCurrentStep, deployBuilder, isLoading
  } = useWizardBuilderStore();
  
  const { openWithQuestion } = useCoPilotContext();
  const navigate = useNavigate();
  const { twin: activeTwin } = useActiveTwin();

  const [activeTab, setActiveTab] = useState('overview');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTo, setDeployingTo] = useState<string>();
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [governanceConfig, setGovernanceConfig] = useState({ auditEnabled: true, tags: [] as string[] });
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [localKPIs, setLocalKPIs] = useState<any[]>([]);
  const [persistedTwinId, setPersistedTwinId] = useState<string | null>(null);
  const [facilityAvailable, setFacilityAvailable] = useState(false);
  const [readinessEvidenceError, setReadinessEvidenceError] = useState<string | null>('Readiness evidence is still loading.');

  const builderState = useMemo(() => ({
    goal, industry, department, type, template, workflow, modelConfig, kpis: localKPIs,
    connectors: tools.filter(t => t.type === 'integration').map(t => t.name), governance: governanceConfig,
    twin_id: persistedTwinId,
    webhooks: []
  }), [goal, industry, department, type, template, workflow, modelConfig, localKPIs, tools, governanceConfig, persistedTwinId]);

  useEffect(() => {
    if (!builderId) return;
    
    const loadHistory = async () => {
      try {
        setReadinessEvidenceError('Readiness evidence is still loading.');
        const { builder } = await builderService.get(builderId);
        const savedConfig = builder.config || {};
        const twinId = savedConfig.twin_id || builder.twin_id || null;
        setPersistedTwinId(twinId);
        setLocalKPIs(Array.isArray(savedConfig.kpis) ? savedConfig.kpis : []);
        setGovernanceConfig({
          auditEnabled: savedConfig.governance?.auditEnabled !== false,
          tags: Array.isArray(savedConfig.governance?.tags) ? savedConfig.governance.tags : [],
        });

        if (twinId) {
          const [runsResult, facilityResult] = await Promise.all([
            supabase
              .from('simulation_runs')
              .select('id, scenario_name, lifecycle_status, measured_duration_ms, created_at, output_snapshot, events, verification_level')
              .eq('twin_id', twinId)
              .eq('lifecycle_status', 'succeeded')
              .eq('verification_level', 'server-validated')
              .order('created_at', { ascending: false })
              .limit(10),
            supabase
              .from('data_centre_twins')
              .select('id, metadata')
              .eq('id', twinId)
              .maybeSingle(),
          ]);
          const { data: runs, error: runsError } = runsResult;
          if (runsError) throw runsError;
          if (facilityResult.error) throw facilityResult.error;
          const facilityMetadata = facilityResult.data?.metadata
            && typeof facilityResult.data.metadata === 'object'
            && !Array.isArray(facilityResult.data.metadata)
            ? facilityResult.data.metadata as Record<string, unknown>
            : null;
          setFacilityAvailable(Boolean(
            facilityResult.data && facilityMetadata?.provisioned !== 'default_starter_twin',
          ));
          setSimulationHistory((runs || []).map((run) => ({
            id: run.id,
            scenario: run.scenario_name || 'Verified simulation',
            status: 'completed',
            duration: run.measured_duration_ms || 0,
            timestamp: new Date(run.created_at),
            outputs: (run.output_snapshot as any)?.summary || '',
            events: Array.isArray(run.events) ? run.events.length : 0,
            latency: run.measured_duration_ms || 0,
          })));
        } else {
          setFacilityAvailable(false);
          const { data: runs, error: runsError } = await supabase
            .from('agent_runs')
            .select('*')
            .eq('agent_id', builderId)
            .in('status', ['success', 'completed'])
            .order('created_at', { ascending: false })
            .limit(10);
          if (runsError) throw runsError;
          setSimulationHistory((runs || []).map((run) => ({
            id: run.id,
            scenario: (run.input as any)?.scenario || 'Verified agent run',
            status: 'completed',
            duration: run.duration_ms || 0,
            timestamp: new Date(run.created_at!),
            outputs: (run.output as any)?.summary || '',
            events: 0,
            latency: run.duration_ms || 0,
          })));
        }

        const { data: versions } = await supabase
          .from('agent_versions')
          .select('*')
          .eq('agent_id', builderId)
          .order('published_at', { ascending: false })
          .limit(10);
        
        if (versions && versions.length > 0) {
          setVersionHistory(versions.map(v => ({
            id: v.id,
            version: v.version,
            configHash: v.id.substring(0, 8),
            commitMessage: v.commit_message || 'Version snapshot',
            createdAt: new Date(v.published_at!),
            createdBy: 'User',
            changes: ['Configuration updated']
          })));
          setCurrentVersion(versions[0].version);
        } else {
          setVersionHistory([]);
        }
        setReadinessEvidenceError(null);
      } catch (err) {
        console.error('[Step5] Failed to load history:', err);
        setReadinessEvidenceError('Persisted readiness evidence could not be verified.');
      }
    };
    
    loadHistory();
  }, [builderId]);

  const readiness = useMemo(() => evaluateBuilderActivationReadiness(builderState, {
    verifiedSimulationCount: simulationHistory.length,
    versionCount: versionHistory.length,
    facilityAvailable: type !== '3d_twin' && type !== 'process_twin' ? true : facilityAvailable,
    evidenceError: readinessEvidenceError,
  }), [builderState, simulationHistory.length, versionHistory.length, type, facilityAvailable, readinessEvidenceError]);

  const readinessScore = readiness.score;

  const handleNavigateToStep = (step: number) => {
    setCurrentStep(step);
  };

  /**
   * Stage 7H: design surfaces hand off, they never execute. Navigation only.
   */
  const handleOpenInSimulation = () => {
    navigate(
      buildSimulationHandoffUrl({
        blueprintId: activeTwin?.id ?? builderId ?? 'unavailable',
        twinId: activeTwin?.id ?? null,
        returnTab: 'simulation',
      }),
    );
  };

  /**
   * Blueprint hand-off preserves the active facility (twin) id. With no active
   * facility the action states that rather than opening an invented default.
   */
  const handleOpenBlueprint = () => {
    if (!activeTwin?.id) {
      toast.error('No active facility selected. Select a facility to open its Blueprint.');
      return;
    }
    navigate(`/blueprint/${activeTwin.id}`);
  };

  const handleAddKPIs = async (newKPIs: any[]) => {
    if (!builderId || newKPIs.length === 0) return;
    const nextKPIs = [...localKPIs, ...newKPIs];
    try {
      await builderService.update(builderId, { kpis: nextKPIs });
      setLocalKPIs(nextKPIs);
      toast.success(`Saved ${newKPIs.length} KPI(s)`);
    } catch (error) {
      console.error('[Step5] Failed to save KPIs:', error);
      toast.error('KPIs were not saved. Production activation remains blocked.');
    }
  };

  const handleCreateSnapshot = async (message: string) => {
    if (!builderId) {
      toast.error('No builder ID available');
      return false;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        throw new Error('Not authenticated');
      }

      const newVersionNum = `1.0.${versionHistory.length}`;
      
      const { data: version, error } = await supabase
        .from('agent_versions')
        .insert({
          agent_id: builderId,
          version: newVersionNum,
          config_snapshot: { goal, industry, department, type, workflow, modelConfig, kpis: localKPIs, governance: governanceConfig },
          commit_message: message,
          published_by: session.session.user.id,
          published_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      const newVersion = {
        id: version.id,
        version: newVersionNum,
        configHash: version.id.substring(0, 8),
        commitMessage: message,
        createdAt: new Date(),
        createdBy: 'Current User',
        changes: ['Configuration updated']
      };
      
      setVersionHistory(prev => [newVersion, ...prev]);
      setCurrentVersion(newVersionNum);
      toast.success(`Version ${newVersionNum} created`);
      return true;
    } catch (err) {
      console.error('[Step5] Failed to create snapshot:', err);
      toast.error('Failed to create version snapshot');
      return false;
    }
  };

  const handleDeploy = async (environment: 'dev' | 'staging' | 'production') => {
    if (!builderId) {
      toast.error('No builder ID available');
      return;
    }

    if (environment === 'production' && !readiness.isReady) {
      toast.error(`Production activation blocked: ${readiness.blockers.map((item) => item.message).join(' ')}`);
      return;
    }

    setIsDeploying(true);
    setDeployingTo(environment);
    
    try {
      const snapshotCreated = await handleCreateSnapshot(`Deploy to ${environment}`);
      if (!snapshotCreated) return;
      
      if (environment === 'production') {
        const result = await deployBuilder();
        
        if (result.success) {
          toast.success('Deployed to production successfully!');
          navigate('/app/agents');
        } else {
          toast.error(result.message || 'Deployment failed');
        }
      } else {
        const { error } = await supabase
          .from('agents')
          .update({ 
            status: environment === 'dev' ? 'draft' : 'staging',
            updated_at: new Date().toISOString()
          })
          .eq('id', builderId);

        if (error) throw error;
        toast.success(`Deployed to ${environment} successfully!`);
      }
    } catch (err) {
      console.error('[Step5] Deploy failed:', err);
      toast.error('Deployment failed');
    } finally {
      setIsDeploying(false);
      setDeployingTo(undefined);
    }
  };

  const copilotQuestions = [
    { label: 'Review config', question: `Review this DC twin deployment configuration. Is it ready for production?` },
    { label: 'Identify risks', question: `What are the potential risks of deploying this data centre twin to production?` },
    { label: 'Optimize PUE', question: `Suggest PUE optimization strategies for this deployment.` },
  ];

  return (
    <div className="space-y-6 max-w-[920px] mx-auto">
      <DCSectionHeader
        title="Deployment Readiness"
        subtitle="Pre-flight checks and environment deployment pipeline"
        icon={<Rocket className="h-5 w-5" />}
      />

      {/* Readiness Score */}
      <div className="grid gap-4 grid-cols-4">
        <DCKPITile
          label="Readiness Score"
          value={`${readinessScore}%`}
          status={readinessScore >= 80 ? 'normal' : readinessScore >= 50 ? 'warning' : 'critical'}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <DCKPITile
          label="Simulations"
          value={String(simulationHistory.length)}
          sublabel="completed"
          status={simulationHistory.length > 0 ? 'normal' : 'warning'}
          icon={<Zap className="h-4 w-4" />}
        />
        <DCKPITile
          label="Version"
          value={currentVersion}
          sublabel="current"
          status="info"
          icon={<Server className="h-4 w-4" />}
        />
        <DCKPITile
          label="Governance"
          value={governanceConfig.auditEnabled ? 'Enabled' : 'Disabled'}
          status={governanceConfig.auditEnabled ? 'normal' : 'warning'}
          icon={<Shield className="h-4 w-4" />}
        />
      </div>

      {/* Deployment Warnings */}
      <DeploymentWarnings
        builderState={builderState}
        simulationHistory={simulationHistory}
        onNavigateToStep={handleNavigateToStep}
      />

      {/* Readiness Checklist */}
      <ReadinessChecklist
        builderState={builderState}
        simulationHistory={simulationHistory}
        versionHistory={versionHistory}
        governanceConfig={governanceConfig}
        onNavigateToStep={handleNavigateToStep}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
          <TabsTrigger value="version">Versions</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <DeploymentSummaryCard
            builderState={builderState}
            governanceConfig={governanceConfig}
            currentVersion={currentVersion}
          />
          <AutoSuggestedKPIs
            industry={industry}
            existingKPIs={localKPIs}
            onAddKPIs={handleAddKPIs}
          />
        </TabsContent>

        <TabsContent value="blueprint" className="mt-4">
          <BlueprintReviewSection 
            twinId={activeTwin?.id || "unavailable"}
            onOpenBlueprint={handleOpenBlueprint}
          />
        </TabsContent>

        <TabsContent value="simulation" className="mt-4">
          <SimulationPreviewPanel
            simulationHistory={simulationHistory}
            industry={industry}
            onOpenInSimulation={handleOpenInSimulation}
          />
        </TabsContent>

        <TabsContent value="version" className="mt-4">
          <VersionSnapshot
            currentVersion={currentVersion}
            versionHistory={versionHistory}
            builderState={builderState}
            onCreateSnapshot={handleCreateSnapshot}
          />
        </TabsContent>

        <TabsContent value="governance" className="mt-4">
          <GovernancePreviewPanel governanceConfig={governanceConfig} />
        </TabsContent>
      </Tabs>

      {/* Deployment Pipeline */}
      <DCCard title="Deployment Pipeline" icon={<Cloud className="h-4 w-4" />}>
        <div className="grid gap-4 sm:grid-cols-3">
          {(['dev', 'staging', 'production'] as const).map((env) => {
            const isActive = deployingTo === env;
            const envConfig = {
              dev: { label: 'Development', icon: Server, color: 'info' },
              staging: { label: 'Staging', icon: Cloud, color: 'warning' },
              production: { label: 'Production', icon: Rocket, color: 'success' },
            }[env];
            const EnvIcon = envConfig.icon;
            
            return (
              <div 
                key={env}
                className={`p-4 rounded-lg border transition-all ${
                  isActive ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <EnvIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{envConfig.label}</p>
                    <p className="text-xs text-muted-foreground capitalize">{env} environment</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant={env === 'production' ? 'default' : 'outline'}
                  onClick={() => handleDeploy(env)}
                  disabled={isDeploying || (env === 'production' && !readiness.isReady)}
                  title={env === 'production' && !readiness.isReady
                    ? readiness.blockers.map((item) => item.message).join(' ')
                    : undefined}
                >
                  {isActive ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    `Deploy to ${envConfig.label}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DCCard>

      {/* Co-Pilot Integration */}
      <DCCard className="bg-muted/30">
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">Ask AURA Assistant:</span>
          <div className="flex flex-wrap gap-2">
            {copilotQuestions.map((q, idx) => (
              <Button
                key={idx}
                variant="ghost"
                size="sm"
                onClick={() => openWithQuestion(q.question)}
                className="text-xs bg-muted hover:bg-muted/80"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                {q.label}
              </Button>
            ))}
          </div>
        </div>
      </DCCard>
    </div>
  );
}
