import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentChat } from "@/components/builder/AgentChat";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Settings,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle2,
  FileText,
  Loader2,
  Server,
  Cpu,
} from "lucide-react";
import { DCCard } from "@/components/dc-ui/DCCard";
import { DCSectionHeader } from "@/components/dc-ui/DCSectionHeader";
import { DCKPITile } from "@/components/dc-ui/DCKPITile";

export default function AgentWorkspace() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agent, setAgent] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRuns: 0,
    successRate: 100,
    avgResponseTime: 0,
    lastRun: null as string | null,
  });

  useEffect(() => {
    if (id) {
      loadAgent();
    }
  }, [id]);

  const loadAgent = async () => {
    try {
      // Get agent
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (agentError) throw agentError;
      if (!agentData) {
        toast({
          title: "Agent not found",
          description: "The requested agent does not exist",
          variant: "destructive",
        });
        return;
      }
      setAgent(agentData);

      // Get template if exists
      if (agentData.template_id) {
        const templateData = await invokeEdgeFunction('templates-list');
        const tmpl = templateData?.templates?.find((t: any) => t.id === agentData.template_id);
        if (tmpl) {
          setTemplate(tmpl);
        }
      }

      // Get stats
      const { data: runsData } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: false });

      if (runsData && runsData.length > 0) {
        const successfulRuns = runsData.filter(r => r.status === 'completed').length;
        const avgTime = runsData.reduce((acc, r) => acc + (r.duration_ms || 0), 0) / runsData.length;
        
        setStats({
          totalRuns: runsData.length,
          successRate: runsData.length > 0 ? (successfulRuns / runsData.length) * 100 : 0,
          avgResponseTime: Math.round(avgTime),
          lastRun: runsData?.[0]?.created_at || null,
        });
      } else {
        setStats({
          totalRuns: 0,
          successRate: 100,
          avgResponseTime: 0,
          lastRun: null,
        });
      }
    } catch (error) {
      console.error('Failed to load agent:', error);
      toast({
        title: "Error loading agent",
        description: "Failed to load agent details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background section-padding-lg">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">{t("agentWorkspace.notFound")}</h2>
          <Button onClick={() => navigate('/dashboard')} className="bg-primary hover:bg-primary/80">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background section-padding-lg">
      <div className="max-w-7xl mx-auto space-y-6 px-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mb-4 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                <Cpu className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{agent.name}</h1>
                <p className="text-sm text-muted-foreground">{agent.description || "AI Agent Workspace"}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Badge className={agent.status === 'deployed' ? 'bg-success/20 text-success border-success/30' : 'bg-muted text-muted-foreground'}>
                {agent.status}
              </Badge>
              {template && (
                <Badge variant="outline" className="border-border">
                  {template.icon} {template.name}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/builder?id=${id}`)}
            className="border-border hover:bg-muted"
          >
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DCKPITile
            label="Total Runs"
            value={stats.totalRuns.toString()}
            sublabel="Executions"
            status="info"
            icon={<Activity className="h-4 w-4" />}
            trend={stats.totalRuns > 0 ? 'up' : undefined}
          />
          <DCKPITile
            label="Success Rate"
            value={`${stats.successRate.toFixed(1)}%`}
            sublabel="Reliability index"
            status={stats.successRate >= 90 ? 'normal' : stats.successRate >= 70 ? 'warning' : 'critical'}
            icon={<CheckCircle2 className="h-4 w-4" />}
            thresholdValue={stats.successRate}
            threshold={{ value: stats.successRate, max: 100, showBar: true }}
          />
          <DCKPITile
            label="Avg Response"
            value={`${stats.avgResponseTime}ms`}
            sublabel="Latency"
            status={stats.avgResponseTime < 2000 ? 'normal' : stats.avgResponseTime < 5000 ? 'warning' : 'critical'}
            icon={<Clock className="h-4 w-4" />}
          />
          <DCKPITile
            label="Last Run"
            value={stats.lastRun ? new Date(stats.lastRun).toLocaleDateString() : 'Never'}
            sublabel="Most recent"
            status="info"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList className="bg-muted border border-border">
            <TabsTrigger value="chat" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Activity className="mr-2 h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <FileText className="mr-2 h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <AgentChat
              agentId={agent.id}
              agentName={agent.name}
              samplePrompts={template?.sample_prompts || []}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <DCCard status="info" className="p-6">
              <DCSectionHeader
                title="Performance Analytics"
                subtitle="Agent execution metrics and performance indicators"
                icon={<TrendingUp className="h-5 w-5 text-primary" />}
              />
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Total Conversations</p>
                    <p className="text-2xl font-semibold text-foreground">{stats.totalRuns}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">{t('agentWorkspace.successRate')}</p>
                    <p className="text-2xl font-semibold text-success">{stats.successRate.toFixed(1)}%</p>
                  </div>
                </div>
                {template?.kpi_definitions && template.kpi_definitions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-foreground">Template KPIs</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {template.kpi_definitions.map((kpi: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground">{kpi.label}</p>
                          <p className="text-sm font-medium text-foreground">Target: {kpi.target}{kpi.type === 'percentage' ? '%' : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DCCard>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <DCCard status="info" className="p-6">
              <DCSectionHeader
                title="Run History"
                subtitle="Execution logs and historical data"
                icon={<FileText className="h-5 w-5 text-primary" />}
              />
              <p className="text-muted-foreground mt-4">Run history details will appear here</p>
            </DCCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
