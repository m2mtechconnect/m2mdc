import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wrench, Bot, AlertCircle, ArrowUpRight, Server, Cpu, Thermometer, Globe, Zap as ZapIcon, Activity, Bug, Leaf, Shield } from "lucide-react";
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { UnifiedIntakeModal } from '@/components/dashboard/UnifiedIntakeModal';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import HeroSearchBar from "@/components/HeroSearchBar";
import { SystemDetailsDrawer } from '@/components/SystemDetailsDrawer';
import { SystemDeleteDialog } from '@/components/SystemDeleteDialog';
import { useToast } from '@/hooks/use-toast';
import KpiCard from '@/components/shared/KpiCard';
import { useMutation } from '@tanstack/react-query';
import { useKpi } from '@/hooks/useKpi';
import { UnifiedStats } from '@/components/unified-dashboard/UnifiedStats';
import { UnifiedFilters, FilterState } from '@/components/unified-dashboard/UnifiedFilters';
import { UnifiedItemCard, UnifiedItem } from '@/components/unified-dashboard/UnifiedItemCard';
import { UnifiedTableView } from '@/components/unified-dashboard/UnifiedTableView';
import { DepartmentGroup } from '@/components/unified-dashboard/DepartmentGroup';
import { TrendingUp, Clock, CheckCircle2, Zap } from "lucide-react";
import { trackKPIClick, trackAnalytics } from '@/lib/analytics/analyticsService';
import { useBlueprintAgents } from '@/hooks/useBlueprintAgents';
import { OVERVIEW, TOOLTIPS } from '@/ux';
import { useRBAC } from '@/contexts/RBACContext';
import { getRoleDashboardConfig } from '@/config/roleDashboardConfig';
import { AdaptiveDashboardSections } from '@/components/dashboard/AdaptiveDashboardSections';
import { useRoleTourAutoStart } from '@/hooks/useRoleTourAutoStart';

// DC-specific imports
import { DCKPITile } from '@/components/dc-ui';
import { DCCard } from '@/components/dc-ui';
import { DataCentreSelector } from '@/components/twin-selector';

// UI Polish imports
import { StatusBadge, KpiTooltip, NoTwinSelectedEmptyState, LoadingState, ScannerEmptyState } from '@/components/ui';
import { IndustryComplianceBadges } from '@/components/shared';
import { MetricValue } from '@/components/provenance/MetricValue';
import { demoMetric } from '@/lib/provenance';

// 3D Twin Visualization
import { TwinVisualizationLayout } from '@/components/twin-visualization';

interface Metrics {
  roi: number;
  timeSavedHours: number;
  complianceRate: number;
  agentsDeployed: number;
  totalRuns: number;
  successRate: number;
  avgLatency: number;
}

interface AgentRun {
  id: string;
  status: string;
  duration_ms: number;
  created_at: string;
  agents: { name: string };
}

interface AISystem {
  id: string;
  name: string;
  department: string;
  status: string;
  grounding: boolean;
  roi: number;
  lastActivity: string | null;
  totalRuns: number;
  successRate: number;
  version: string;
  description?: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateContext, askCoPilot } = useCoPilotContext();
  const { twin, activeTwinId, twins: twinsRaw, isLoading: twinsLoading } = useActiveTwin();
  const twins = Array.isArray(twinsRaw) ? twinsRaw : [];
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [deleteSystemId, setDeleteSystemId] = useState<string | null>(null);
  const [deleteSystemName, setDeleteSystemName] = useState<string>('');
  const [deleteSystemStatus, setDeleteSystemStatus] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const { role } = useRBAC();
  const roleConfig = getRoleDashboardConfig(role);
  
  // Auto-start role-specific onboarding tour on first visit
  useRoleTourAutoStart();
  
  // Unified dashboard state
  const [currentTab, setCurrentTab] = useState('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    return (localStorage.getItem('dashboard-view-mode') as 'card' | 'table') || 'card';
  });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    department: 'All',
    type: [],
    status: [],
    roiMin: 0,
    roiMax: 500,
    sortBy: 'updated_at',
    sortOrder: 'desc',
  });
  
  // Intake modal state
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // Check authentication status and redirect if needed
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.warn('Authentication check failed:', error?.message || 'No session');
        navigate('/auth', { replace: true });
        return;
      }
      
      setIsAuthenticated(true);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth', { replace: true });
      } else {
        setIsAuthenticated(!!session);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);
  
  // Update Co-Pilot context when tab changes
  useEffect(() => {
    updateContext({
      activePage: 'dashboard',
    });
  }, [updateContext]);

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('dashboard-view-mode', viewMode);
  }, [viewMode]);

  // Use KPI hooks with real-time data
  const roiKpi = useKpi('roi_growth');
  const timeSavedKpi = useKpi('time_saved');
  const complianceKpi = useKpi('compliance_accuracy');
  const agentsKpi = useKpi('agents_deployed');
  
  // Get blueprint agents (source of truth for subsystem agents)
  const { unifiedItems: blueprintAgents } = useBlueprintAgents();

  // Fetch unified systems and agents
  const { data: unifiedData, isLoading: systemsLoading, isError: systemsError, error: systemsErrorDetails } = useQuery({
    queryKey: ['unified-systems', currentTab, filters, page],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-systems-unified', {
        body: {
          tab: currentTab,
          ...filters,
          department: filters.department !== 'All' ? filters.department : '',
          page,
          pageSize: 15,
        }
      });
      if (error) throw error;
      
      let result = data;
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        const envelope = data as { success: boolean; data: any };
        if (!envelope.success) {
          throw new Error('API returned error');
        }
        result = envelope.data;
      }
      
      return result as {
        items: UnifiedItem[];
        stats: { total: number; active: number; draft: number; archived: number; avgRoi: number };
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
      };
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
    retry: 2,
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unified-systems'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Group items by department
  const groupedByDepartment = (unifiedData?.items ?? []).reduce((acc, item) => {
    if (!acc[item.department]) {
      acc[item.department] = [];
    }
    acc[item.department].push(item);
    return acc;
  }, {} as Record<string, UnifiedItem[]>) || {};

  const deleteMutation = useMutation({
    mutationFn: async (systemId: string) => {
      const { data, error } = await supabase.functions.invoke('systems-delete', {
        body: { systemId }
      });
      if (error) throw error;
      
      let result = data;
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        const envelope = data as { success: boolean; data: any };
        if (!envelope.success) {
          throw new Error('API returned error');
        }
        result = envelope.data;
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unified-systems'] });
      setDeleteSystemId(null);
      toast({
        title: '✅ System deleted successfully',
        description: `${data.systemName} has been permanently removed.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Error deleting system',
        description: error?.message || 'Failed to delete system',
        variant: 'destructive',
      });
    },
  });

  const handleRun = (item: UnifiedItem) => {
    navigate(`/agents/${item.id}/chat`);
  };
 
  const handleManage = (item: UnifiedItem) => {
    navigate(`/twins/${item.id}/manage`);
  };

  const handleDelete = (item: UnifiedItem) => {
    setDeleteSystemId(item.id);
    setDeleteSystemName(item.name);
    setDeleteSystemStatus(item.status);
  };

  const handleDeleteConfirm = () => {
    if (deleteSystemId) {
      deleteMutation.mutate(deleteSystemId);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteSystemId(null);
    setDeleteSystemName('');
    setDeleteSystemStatus('');
  };

  const handleStatClick = (filter: string) => {
    if (filter === 'all') {
      setCurrentTab('all');
      setFilters({ ...filters, status: [] });
    } else if (filter === 'archived') {
      setCurrentTab('archived');
    } else {
      setCurrentTab('all');
      setFilters({ ...filters, status: [filter] });
    }
  };

  // Check if we have any data
  const hasData = unifiedData && unifiedData.stats.total > 0;
  const isEmpty = !roiKpi.loading && !timeSavedKpi.loading && !complianceKpi.loading && !agentsKpi.loading && !hasData;

  // KPIs for Dashboard - Use twins from TwinContext for accurate counts
  const totalTwins = twins.length || 0;
  const activeTwins = blueprintAgents.filter(a => a.status === 'running' || a.status === 'active').length || 9;
  const draftTwins = unifiedData?.stats.draft || 0;
  
  // Calculate average PUE from twins
  const avgPue = twins.length > 0 
    ? (twins.reduce((sum, t) => sum + (t.pue_target || 1.4), 0) / twins.length).toFixed(2)
    : '1.38';
  
  const kpis = [
    {
      key: 'total_twins',
      label: t('dashboard.totalDataCentreTwins'),
      value: totalTwins.toString(),
      change: twins.length > 0 ? t('dashboard.configured', { count: twins.length }) : '',
      trend: "neutral" as const,
      icon: Server,
      loading: twinsLoading || systemsLoading,
      onClick: () => navigate('/data-centre-twin'),
      tooltip: t('dashboard.totalConfigured'),
    },
    {
      key: 'active_twins',
      label: t('dashboard.activeTwins'),
      value: activeTwins.toString(),
      change: '',
      trend: "up" as const,
      icon: Activity,
      loading: systemsLoading,
      onClick: () => handleStatClick('running'),
      tooltip: t('dashboard.currentlyActive'),
    },
    {
      key: 'draft_twins',
      label: t('dashboard.draftTwins'),
      value: draftTwins.toString(),
      change: '',
      trend: "neutral" as const,
      icon: Clock,
      loading: systemsLoading,
      onClick: () => handleStatClick('draft'),
      tooltip: t('dashboard.twinsInDevelopment'),
    },
    {
      key: 'avg_pue',
      label: t('dashboard.averagePue'),
      value: avgPue,
      change: '-2.1%',
      trend: "down" as const,
      icon: ZapIcon,
      loading: twinsLoading,
      onClick: () => navigate('/data-centre-twin'),
      tooltip: t('dashboard.avgPueTooltip'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 sm:py-10 max-w-7xl space-y-8">
        {/* Header Section */}
        <section className="text-center px-4" data-tour="role-header">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Server className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-h1 font-display text-gradient-hero">
              {roleConfig.greeting}
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant="outline" className="text-xs gap-1.5 bg-primary/5 border-primary/30">
              <Shield className="h-3 w-3 text-primary" />
              {roleConfig.label} View
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto mb-6">
            {roleConfig.description}
          </p>
          
          {/* Current Twin Indicator with Status Badges */}
          {twin && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Badge variant="accent" className="text-xs gap-1.5 bg-accent/20 text-foreground border-accent/40">
                <Server className="h-3 w-3 text-accent" />
                {twin.name}
              </Badge>
              <Badge variant="accent" className="text-xs gap-1 bg-accent/15 text-foreground border-accent/30">
                <Globe className="h-3 w-3 text-accent" />
                {twin.city} • {twin.tier}
              </Badge>
              {twin.industry && (
                <IndustryComplianceBadges industry={twin.industry} />
              )}
              <Link to="/twin-debug">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground hover:text-foreground">
                  <Bug className="h-3 w-3" />
                  Debug
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* Hero Search Bar */}
        <div data-tour="role-search">
        <HeroSearchBar 
          onCoPilotQuery={(query) => {
            console.log('[Dashboard] Hero Co-Pilot query:', query);
            askCoPilot(query);
          }}
        />
        </div>

        {/* DC Quick Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 mb-4">
          {[
            { label: t('dashboard.pueTrend'), query: 'What is the PUE trend over the last 24 hours?' },
            { label: t('dashboard.gpuHotspots'), query: 'Identify GPU saturation hotspots across all clusters.' },
            { label: t('dashboard.coolingIncidents'), query: 'List all cooling incidents that occurred today.' },
            { label: t('dashboard.sovereignComputeRatio'), query: 'What is the current sovereign compute ratio?' },
            { label: t('dashboard.carbonCostForecast'), query: 'Forecast carbon costs for the next 7 days.' },
            { label: t('dashboard.runScenario'), isSimulation: true },
          ].map((chip: { label: string; query?: string; isSimulation?: boolean }) => (
            <button
              key={chip.label}
              onClick={() => chip.isSimulation ? navigate('/data-centre-twin/default?view=simulation&demo=true') : askCoPilot(chip.query || '')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                chip.isSimulation 
                  ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20' 
                  : 'border-border bg-muted/50 hover:bg-primary/10 hover:border-primary/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {chip.isSimulation && <Activity className="h-3 w-3 inline mr-1" />}
              {chip.label}
            </button>
          ))}
        </div>

        {/* DC-Specific KPI Row with Tooltips */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4" data-tour="role-kpi-dc">
          {/*
            Phase 1A.1 §3: these tiles were hard-coded literal strings
            ("1.38", "23%", "94%", "98%") with no data source. They now use
            `MetricValue` with `demoMetric` so users never mistake a
            demonstration fixture for a live reading. When a validated
            telemetry source is wired in Phase 1B, swap `demoMetric(...)` for
            the source-appropriate factory.
          */}
          <KpiTooltip title={t('dashboard.pueTooltip')} description="">
            <Card className="p-5 border hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50" onClick={() => navigate('/data-centre-twin')}>
              <MetricValue
                id="dashboard-pue"
                label={t('dashboard.globalPue')}
                metric={demoMetric<number>(1.38, 'demo-fixture')}
                format={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v))}
                icon={<ZapIcon className="h-4 w-4 text-success" />}
              />
            </Card>
          </KpiTooltip>

          <KpiTooltip title={t('dashboard.gpuTooltip')} description="">
            <Card className="p-5 border hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50" onClick={() => navigate('/data-centre-twin')}>
              <MetricValue
                id="dashboard-gpu"
                label={t('dashboard.gpuSaturation')}
                metric={demoMetric<number>(23, 'demo-fixture')}
                unit="%"
                icon={<Cpu className="h-4 w-4 text-primary" />}
              />
            </Card>
          </KpiTooltip>

          <KpiTooltip title={t('dashboard.thermalTooltip')} description="">
            <Card className="p-5 border hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50" onClick={() => navigate('/data-centre-twin')}>
              <MetricValue
                id="dashboard-thermal"
                label={t('dashboard.thermalStability')}
                metric={demoMetric<number>(94, 'demo-fixture')}
                unit="%"
                icon={<Thermometer className="h-4 w-4 text-info" />}
                footer={<StatusBadge status="active" customLabel={t('global.stable')} showIcon={false} />}
              />
            </Card>
          </KpiTooltip>

          <KpiTooltip title={t('dashboard.sovereignTooltip')} description="">
            <Card className="p-5 border hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50" onClick={() => navigate('/data-centre-twin')}>
              <MetricValue
                id="dashboard-sovereign"
                label={t('dashboard.sovereignCompute')}
                metric={demoMetric<number>(98, 'demo-fixture')}
                unit="%"
                icon={<Shield className="h-4 w-4 text-info" />}
                footer={
                  <span className="inline-flex items-center gap-1"><Leaf className="h-3 w-3" />Applicable frameworks configured</span>
                }
              />
            </Card>
          </KpiTooltip>
        </section>

        {/* Live Twin 3D Preview */}
        {twin && (
          <Card className="mb-6 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {t('dashboard.liveTwinPreview')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <TwinVisualizationLayout mode="dashboard" />
            </CardContent>
          </Card>
        )}

        {/* Quick Link to DC Twin */}
        <div className="mb-8">
          <Link to="/data-centre-twin">
            <Card className="p-4 cursor-pointer group border hover:border-primary/50 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {t('dashboard.openDcTwinDashboard')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.nocViewDescription')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/blueprint/default');
                    }}
                    className="gap-2"
                  >
                    <Server className="h-4 w-4" />
                    {t('dashboard.viewBlueprint')}
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/data-centre-twin/default?view=simulation&demo=true');
                    }}
                    className="gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    {t('dashboard.runSimulation')}
                  </Button>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Green DC Twin Scanner - Now unified in HeroSearchBar above */}

        {/* Twin Stats */}
        {isEmpty && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-center text-muted-foreground">
              {t('dashboard.noTelemetry')}
            </p>
          </div>
        )}
        
        {/* Role-Adaptive KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card-gap mb-8" data-tour="role-kpi-row">
          {roleConfig.kpis.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.defaultValue}
              change={kpi.change}
              trend={kpi.trend}
              icon={kpi.icon}
              loading={false}
              tooltip={kpi.tooltip}
              onClick={kpi.navigateTo ? () => navigate(kpi.navigateTo!) : undefined}
            />
          ))}
        </div>

        {/* Role-Adaptive Dashboard Sections */}
        <div data-tour="role-sections">
          <AdaptiveDashboardSections sections={roleConfig.sections} />
        </div>
      </div>

      {/* Modals & Drawers */}
      <UnifiedIntakeModal
        open={showIntakeModal}
        onOpenChange={setShowIntakeModal}
      />
      
      <SystemDetailsDrawer
        systemId={selectedSystem}
        open={!!selectedSystem}
        onClose={() => setSelectedSystem(null)}
      />
      
      <SystemDeleteDialog
        systemName={deleteSystemName}
        systemStatus={deleteSystemStatus}
        open={!!deleteSystemId}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
