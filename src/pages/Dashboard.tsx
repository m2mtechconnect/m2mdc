import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wrench, Bot, AlertCircle, ArrowUpRight, Sparkles } from "lucide-react";
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

  // Use KPI hooks with real-time data (shared with Intelligence Dashboard)
  // These hooks query RPC functions: rpc_kpi_roi_growth, rpc_kpi_time_saved, etc.
  // Data sources: roi_snapshots, agent_runs, agents tables
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
      
      // Handle REST envelope if present
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
      
      // Handle REST envelope if present
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
    // Navigate to unified system management view
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

  // KPIs for Dashboard with deep links to Analytics
  const kpis = [
    {
      key: 'roi_growth',
      label: 'Total ROI Growth',
      value: roiKpi.formatted,
      change: roiKpi.deltaFormatted,
      trend: roiKpi.delta >= 0 ? "up" as const : "down" as const,
      icon: TrendingUp,
      loading: roiKpi.loading,
      onClick: () => {
        trackKPIClick('roi_growth', '/intelligence?tab=roi');
        navigate('/intelligence?tab=roi');
      },
      tooltip: isEmpty 
        ? 'No data yet. Deploy your first twin or agent to start tracking ROI. Click to view analytics.'
        : 'Click to view detailed ROI analytics and trends',
      subtext: isEmpty ? 'Deploy systems to track' : undefined,
    },
    {
      key: 'time_saved',
      label: 'Time Saved',
      value: timeSavedKpi.formatted,
      change: timeSavedKpi.deltaFormatted,
      trend: timeSavedKpi.delta >= 0 ? "up" as const : "down" as const,
      icon: Clock,
      loading: timeSavedKpi.loading,
      onClick: () => {
        trackKPIClick('time_saved', '/intelligence?tab=performance');
        navigate('/intelligence?tab=performance');
      },
      tooltip: isEmpty
        ? 'No data yet. Deploy your first twin or agent to start tracking time savings. Click to view analytics.'
        : 'Click to view detailed time savings and productivity metrics',
      subtext: isEmpty ? 'Deploy systems to track' : undefined,
    },
    {
      key: 'compliance_accuracy',
      label: 'Compliance Accuracy',
      value: complianceKpi.formatted,
      change: complianceKpi.deltaFormatted,
      trend: complianceKpi.delta >= 0 ? "up" as const : "down" as const,
      icon: CheckCircle2,
      loading: complianceKpi.loading,
      onClick: () => {
        trackKPIClick('compliance_accuracy', '/intelligence?tab=monitoring');
        navigate('/intelligence?tab=monitoring');
      },
      tooltip: isEmpty
        ? 'No data yet. Deploy your first twin or agent to start tracking compliance. Click to view analytics.'
        : 'Click to view detailed compliance metrics and accuracy trends',
      subtext: isEmpty ? 'Deploy systems to track' : undefined,
    },
    {
      key: 'agents_deployed',
      label: 'Twins & Agents Deployed',
      value: agentsKpi.formatted,
      change: agentsKpi.deltaFormatted,
      trend: agentsKpi.delta >= 0 ? "up" as const : "down" as const,
      icon: Zap,
      loading: agentsKpi.loading,
      onClick: () => {
        trackKPIClick('agents_deployed', '/intelligence?tab=performance');
        navigate('/intelligence?tab=performance');
      },
      tooltip: isEmpty
        ? 'No active systems yet. Click to start building your first twin or agent.'
        : 'Click to view all active systems and deployment history',
      subtext: isEmpty ? 'Start building' : 'Active systems',
    },
  ];

  const quickActions = [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center px-4">
          <h1 className="text-h1 font-display mb-3 text-gradient-hero">
            Welcome to AURA
          </h1>
          <p className="text-body text-lg sm:text-xl max-w-3xl mx-auto">
            Powering enterprise-grade digital twins and autonomous AI agents.
          </p>
        </div>

      {/* Hero Search Bar */}
      <HeroSearchBar 
        onCoPilotQuery={(query) => {
          console.log('[Dashboard] Hero Co-Pilot query:', query);
          askCoPilot(query);
        }}
      />

        {/* KPI Cards - Dashboard Summary - Fully Responsive */}
        {isEmpty && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-center text-muted-foreground">
              💡 <strong>No analytics data yet.</strong> Deploy your first digital twin or agent to start tracking ROI, time savings, and compliance metrics. Click any card below to explore the analytics dashboard.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card-gap mb-8 mt-8">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              change={kpi.change}
              trend={kpi.trend}
              icon={kpi.icon}
              loading={kpi.loading}
              subtext={kpi.subtext}
              tooltip={kpi.tooltip}
              onClick={kpi.onClick}
            />
          ))}
        </div>

        {/* Quick Actions - Hidden when empty */}
        {quickActions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-card-gap mb-8">
            {quickActions.map((action) => (
              <Link key={action.label} to={action.href}>
                <Card className="p-6 cursor-pointer group bg-secondary/5 border-secondary/10 hover:border-secondary/30 transition-smooth min-h-[44px]">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-secondary/10 flex-shrink-0">
                      <action.icon className="h-5 w-5 icon-default icon-hover-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold mb-1 group-hover:text-primary transition-smooth">
                        {action.label}
                      </h3>
                      <p className="text-sm text-body">
                        {action.description}
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 icon-muted icon-hover-gold flex-shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Unified AI Systems & Agents Dashboard */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-h2 font-display mb-1 flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                Digital Twins & Agents Dashboard
              </h2>
              <p className="text-sm text-body">
                Unified view of your digital twins, agents, and automation systems.
              </p>
            </div>
            <Button 
              onClick={() => setShowIntakeModal(true)}
              className="glow-gold font-semibold min-h-[44px]"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Start Your Twin/Agent Intake
            </Button>
          </div>

          {/* Stats Overview */}
          {unifiedData && (
            <UnifiedStats stats={unifiedData.stats} onStatClick={handleStatClick} />
          )}

          {/* Tabs */}
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All Twins & Agents</TabsTrigger>
              <TabsTrigger value="systems">Twins</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="favorites">Starred</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <UnifiedFilters
            filters={filters}
            onFiltersChange={setFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Content */}
          {systemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : systemsError ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="mb-4 p-4 rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Failed to Load Systems</h3>
                <p className="text-muted-foreground mb-4">
                  {systemsErrorDetails instanceof Error ? systemsErrorDetails.message : 'An error occurred'}
                </p>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['unified-systems'] })}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : !unifiedData?.items || unifiedData.items.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No systems found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.department !== 'All'
                  ? 'Try adjusting your filters'
                  : 'Build your first AI system to get started'}
              </p>
              <Button onClick={() => setShowIntakeModal(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Start Your Twin/Agent Intake
              </Button>
            </div>
          ) : (
            <div className="space-y-6 mt-6">
              {/* View Mode: Card or Table */}
              {viewMode === 'table' ? (
                <UnifiedTableView
                  items={unifiedData.items}
                  onRun={handleRun}
                  onManage={handleManage}
                  onDelete={handleDelete}
                />
              ) : (
                /* Group by Department */
                Object.keys(groupedByDepartment).length > 1 ? (
                  Object.entries(groupedByDepartment).map(([dept, items]) => (
                    <DepartmentGroup
                      key={dept}
                      department={dept}
                      items={items}
                      onRun={handleRun}
                      onManage={handleManage}
                      onDelete={handleDelete}
                    />
                  ))
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {unifiedData.items.map((item) => (
                      <UnifiedItemCard
                        key={item.id}
                        item={item}
                        onRun={handleRun}
                        onManage={handleManage}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )
              )}

              {/* Pagination */}
              {unifiedData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {unifiedData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= unifiedData.pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Remove AgentsList - now unified above */}
      </div>

      {/* System Details Drawer */}
      {selectedSystem && (
        <SystemDetailsDrawer
          systemId={selectedSystem}
          open={!!selectedSystem}
          onClose={() => setSelectedSystem(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <SystemDeleteDialog
        open={!!deleteSystemId}
        systemName={deleteSystemName}
        systemStatus={deleteSystemStatus}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={deleteMutation.isPending}
      />

      {/* Unified Intake Modal */}
      <UnifiedIntakeModal
        open={showIntakeModal}
        onOpenChange={setShowIntakeModal}
      />
    </div>
  );
}
