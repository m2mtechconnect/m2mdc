import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wrench, Bot, AlertCircle, ArrowUpRight, Server, Cpu, Thermometer, Globe, Zap as ZapIcon, Activity } from "lucide-react";
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { UnifiedIntakeModal } from '@/components/dashboard/UnifiedIntakeModal';
import { useCoPilotContext } from '@/contexts/CoPilotContext';
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

// DC-specific imports
import { DCKPITile } from '@/components/dc-ui';
import { DCCard } from '@/components/dc-ui';

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateContext, askCoPilot } = useCoPilotContext();
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [deleteSystemId, setDeleteSystemId] = useState<string | null>(null);
  const [deleteSystemName, setDeleteSystemName] = useState<string>('');
  const [deleteSystemStatus, setDeleteSystemStatus] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
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
  const groupedByDepartment = unifiedData?.items.reduce((acc, item) => {
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

  // KPIs for Dashboard
  const kpis = [
    {
      key: 'total_twins',
      label: 'Total Data Centre Twins',
      value: unifiedData?.stats.total?.toString() || '0',
      change: '',
      trend: "neutral" as const,
      icon: Server,
      loading: systemsLoading,
      onClick: () => navigate('/twins'),
      tooltip: 'Total number of Data Centre Twins configured',
    },
    {
      key: 'active_twins',
      label: 'Active Twins',
      value: unifiedData?.stats.active?.toString() || '0',
      change: '',
      trend: "up" as const,
      icon: Activity,
      loading: systemsLoading,
      onClick: () => handleStatClick('running'),
      tooltip: 'Currently active and running twins',
    },
    {
      key: 'draft_twins',
      label: 'Draft Twins',
      value: unifiedData?.stats.draft?.toString() || '0',
      change: '',
      trend: "neutral" as const,
      icon: Clock,
      loading: systemsLoading,
      onClick: () => handleStatClick('draft'),
      tooltip: 'Twins in development',
    },
    {
      key: 'avg_pue',
      label: 'Average PUE',
      value: '1.38',
      change: '-2.1%',
      trend: "down" as const,
      icon: ZapIcon,
      loading: false,
      onClick: () => navigate('/data-centre-twin'),
      tooltip: 'Average Power Usage Effectiveness across all facilities',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center px-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-h1 font-display text-gradient-hero">
              Data Centre Command
            </h1>
          </div>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto">
            Monitor PUE, thermals, power, sovereign compute, and GPU workloads.
          </p>
        </div>

        {/* Hero Search Bar */}
        <HeroSearchBar 
          onCoPilotQuery={(query) => {
            console.log('[Dashboard] Hero Co-Pilot query:', query);
            askCoPilot(query);
          }}
        />

        {/* DC Quick Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 mb-4">
          {[
            { label: 'PUE trend (24h)', query: 'What is the PUE trend over the last 24 hours?' },
            { label: 'GPU saturation hotspots', query: 'Identify GPU saturation hotspots across all clusters.' },
            { label: 'Cooling incidents today', query: 'List all cooling incidents that occurred today.' },
            { label: 'Sovereign compute ratio', query: 'What is the current sovereign compute ratio?' },
            { label: 'Carbon cost forecast', query: 'Forecast carbon costs for the next 7 days.' },
            { label: 'Run a scenario', isSimulation: true },
          ].map((chip: { label: string; query?: string; isSimulation?: boolean }) => (
            <button
              key={chip.label}
              onClick={() => chip.isSimulation ? navigate('/data-centre-twin?view=simulation') : askCoPilot(chip.query || '')}
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

        {/* DC-Specific KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 mb-8">
          <Card className="p-4 border hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/data-centre-twin')}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ZapIcon className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Global PUE</span>
            </div>
            <div className="font-mono text-2xl font-bold">1.38</div>
            <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
              ↓ 2.1% improvement
            </div>
          </Card>
          
          <Card className="p-4 border hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/data-centre-twin')}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Cpu className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">GPU Saturation</span>
            </div>
            <div className="font-mono text-2xl font-bold">23%</div>
            <div className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              ↑ 4.2% from baseline
            </div>
          </Card>
          
          <Card className="p-4 border hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/data-centre-twin')}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Thermometer className="h-4 w-4 text-cyan-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Thermal Stability</span>
            </div>
            <div className="font-mono text-2xl font-bold">94%</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              Stable
            </div>
          </Card>
          
          <Card className="p-4 border hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/data-centre-twin')}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Globe className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sovereign Compute</span>
            </div>
            <div className="font-mono text-2xl font-bold">98%</div>
            <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
              Canada-compliant
            </div>
          </Card>
        </div>

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
                      Open Data Centre Twin Dashboard
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Full NOC view with 8 domain twins, real-time telemetry, and simulation controls
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
                    View Blueprint
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/data-centre-twin?view=simulation');
                    }}
                    className="gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    Run Simulation
                  </Button>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Twin Stats */}
        {isEmpty && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-center text-muted-foreground">
              No live telemetry yet. Connect a facility or start the Data Centre Simulation.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card-gap mb-8">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              change={kpi.change}
              trend={kpi.trend}
              icon={kpi.icon}
              loading={kpi.loading}
              tooltip={kpi.tooltip}
              onClick={kpi.onClick}
            />
          ))}
        </div>

        {/* Digital Twins & Subsystem Agents */}
        <Card className="border">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Digital Twins & Subsystem Agents</h2>
                <p className="text-sm text-muted-foreground">Manage Data Centre subsystems</p>
              </div>
              <Button onClick={() => navigate('/builder?template=data-centre-twin')}>
                <Wrench className="h-4 w-4 mr-2" />
                Configure New Twin
              </Button>
            </div>
          </div>
          
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="all">All Systems</TabsTrigger>
                <TabsTrigger value="twins">Twins</TabsTrigger>
                <TabsTrigger value="agents">Subsystem Agents</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              <UnifiedFilters
                filters={filters}
                onFiltersChange={setFilters}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>

            <TabsContent value="all" className="mt-0 px-4 pb-4">
              {systemsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : unifiedData?.items.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                  <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Data Centre Twins configured yet.</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure your first Data Centre Twin to start monitoring.
                  </p>
                  <Button onClick={() => navigate('/builder?template=data-centre-twin')}>
                    Configure Your First Data Centre Twin
                  </Button>
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unifiedData?.items.map((item) => (
                    <UnifiedItemCard
                      key={item.id}
                      item={item}
                      onRun={handleRun}
                      onManage={handleManage}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <UnifiedTableView
                  items={unifiedData?.items || []}
                  onRun={handleRun}
                  onManage={handleManage}
                  onDelete={handleDelete}
                />
              )}
            </TabsContent>

            <TabsContent value="twins" className="mt-0 px-4 pb-4">
              {systemsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unifiedData?.items.filter(i => i.type === 'twin').map((item) => (
                    <UnifiedItemCard
                      key={item.id}
                      item={item}
                      onRun={handleRun}
                      onManage={handleManage}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="agents" className="mt-0 px-4 pb-4">
              {systemsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unifiedData?.items.filter(i => i.type === 'agent').map((item) => (
                    <UnifiedItemCard
                      key={item.id}
                      item={item}
                      onRun={handleRun}
                      onManage={handleManage}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="archived" className="mt-0 px-4 pb-4">
              <div className="text-center py-12 text-muted-foreground">
                No archived data centre twins.
              </div>
            </TabsContent>
          </Tabs>
        </Card>
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
