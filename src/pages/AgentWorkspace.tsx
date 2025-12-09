import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeader } from "@/components/ui/section-header";
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
} from "lucide-react";
import KpiCard from "@/components/shared/KpiCard";

export default function AgentWorkspace() {
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
          <h2 className="text-h2 mb-4">Agent not found</h2>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background section-padding-lg">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <SectionHeader
              title={agent.name}
              description={agent.description || "AI Agent Workspace"}
            />
            <div className="flex gap-2 mt-2">
              <Badge variant={agent.status === 'deployed' ? 'default' : 'secondary'}>
                {agent.status}
              </Badge>
              {template && (
                <Badge variant="outline">
                  {template.icon} {template.name}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/builder?id=${id}`)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard
            label="Total Runs"
            value={stats.totalRuns}
            icon={Activity}
            trend={stats.totalRuns > 0 ? 'up' : undefined}
          />
          <KpiCard
            label="Success Rate"
            value={`${stats.successRate.toFixed(1)}%`}
            icon={CheckCircle2}
            trend="up"
          />
          <KpiCard
            label="Avg Response"
            value={`${stats.avgResponseTime}ms`}
            icon={Clock}
            trend={stats.avgResponseTime < 2000 ? 'up' : 'down'}
          />
          <KpiCard
            label="Last Run"
            value={stats.lastRun ? new Date(stats.lastRun).toLocaleDateString() : 'Never'}
            icon={TrendingUp}
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chat">
              <Activity className="mr-2 h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="history">
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
            <Card className="p-6">
              <h3 className="text-h3 mb-4">Performance Analytics</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-caption text-muted-foreground">Total Conversations</p>
                    <p className="text-h2">{stats.totalRuns}</p>
                  </div>
                  <div>
                    <p className="text-caption text-muted-foreground">Success Rate</p>
                    <p className="text-h2">{stats.successRate.toFixed(1)}%</p>
                  </div>
                </div>
                {template?.kpi_definitions && template.kpi_definitions.length > 0 && (
                  <div>
                    <h4 className="text-h4 mb-2">Template KPIs</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {template.kpi_definitions.map((kpi: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg">
                          <p className="text-caption text-muted-foreground">{kpi.label}</p>
                          <p className="text-h4">Target: {kpi.target}{kpi.type === 'percentage' ? '%' : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-h3 mb-4">Run History</h3>
              <p className="text-muted-foreground">Run history details will appear here</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
