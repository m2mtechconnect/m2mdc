import { useTranslation } from "react-i18next";
/**
 * Agent Detail Page - Full editor for agent definitions
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, Play, Settings, Cpu, Zap, Shield, 
  FileText, BarChart3, Clock, AlertTriangle, Loader2,
  Thermometer, Wind, Network, Globe, Leaf, Bot
} from 'lucide-react';
import { useAgentDefinition } from '@/hooks/useAgentDefinitions';
import { useAgentRuns, useStartAgentRun } from '@/hooks/useAgentRuns';
import { DOMAIN_INFO, TYPE_INFO } from '@/types/agentDefinition';
import { cn } from '@/lib/utils';
import { AgentRunsList } from '@/components/agents/AgentRunsList';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Thermometer, Zap, Wind, Network, Shield, Cpu, Globe, Leaf, AlertTriangle, Bot,
};

const AgentDetail: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: agent, isLoading, error } = useAgentDefinition(slug);
  const { data: runs = [], refetch: refetchRuns } = useAgentRuns(agent?.id, 20);
  const startRun = useStartAgentRun();
  
  const handleRun = async () => {
    if (!agent) return;
    try {
      await startRun.mutateAsync({ agentDefinitionId: agent.id });
    } catch (e) {
      // Error handled by mutation
    }
  };
  
  // Runs are now already transformed by the hook
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error || !agent) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg">{t("agentDetail.notFound")}</p>
        <Button variant="outline" onClick={() => navigate('/subsystem-agents')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agents
        </Button>
      </div>
    );
  }
  
  const IconComponent = ICON_MAP[agent.icon] || Bot;
  const domainInfo = DOMAIN_INFO[agent.domain];
  const typeInfo = TYPE_INFO[agent.type];

  return (
    <div className="flex flex-col h-screen">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/subsystem-agents')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className={cn("p-2.5 rounded-lg bg-muted", domainInfo.color)}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">{agent.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{domainInfo.label}</Badge>
                    <Badge variant="outline">{typeInfo.label}</Badge>
                    {agent.isSystemDefault && (
                      <Badge variant="default" className="bg-blue-500">System</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="default" 
                  onClick={handleRun}
                  disabled={startRun.isPending}
                >
                  {startRun.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Run Agent
                </Button>
              </div>
            </div>
          </header>
          
          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="overview">
                    <FileText className="mr-2 h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="inputs">
                    <Cpu className="mr-2 h-4 w-4" />
                    Inputs
                  </TabsTrigger>
                  <TabsTrigger value="outputs">
                    <Zap className="mr-2 h-4 w-4" />
                    Outputs
                  </TabsTrigger>
                  <TabsTrigger value="tools">
                    <Settings className="mr-2 h-4 w-4" />
                    Tools
                  </TabsTrigger>
                  <TabsTrigger value="kpis">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    KPIs
                  </TabsTrigger>
                  <TabsTrigger value="runtime">
                    <Clock className="mr-2 h-4 w-4" />
                    Runtime & Safety
                  </TabsTrigger>
                  <TabsTrigger value="logs">
                    <FileText className="mr-2 h-4 w-4" />
                    Logs
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Agent Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Name</Label>
                            <Input value={agent.name} readOnly={agent.isSystemDefault} />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea 
                              value={agent.description || ''} 
                              readOnly={agent.isSystemDefault}
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Domain</Label>
                              <Input value={domainInfo.label} readOnly />
                            </div>
                            <div>
                              <Label>Type</Label>
                              <Input value={typeInfo.label} readOnly />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Performance Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-4 gap-4">
                            <div className="text-center p-4 rounded-lg bg-muted">
                              <p className="text-2xl font-bold">{agent.totalRuns}</p>
                              <p className="text-sm text-muted-foreground">Total Runs</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-muted">
                              <p className={cn(
                                "text-2xl font-bold",
                                agent.successRate >= 90 ? "text-green-500" : 
                                agent.successRate >= 70 ? "text-yellow-500" : "text-red-500"
                              )}>
                                {agent.successRate.toFixed(1)}%
                              </p>
                              <p className="text-sm text-muted-foreground">Success Rate</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-muted">
                              <p className="text-2xl font-bold">
                                {agent.avgDurationMs > 0 ? `${(agent.avgDurationMs / 1000).toFixed(1)}s` : '-'}
                              </p>
                              <p className="text-sm text-muted-foreground">Avg Duration</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-muted">
                              <p className="text-2xl font-bold">{agent.tools.length}</p>
                              <p className="text-sm text-muted-foreground">Tools</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div>
                      <AgentRunsList 
                        runs={runs} 
                        onRefresh={() => refetchRuns()}
                        maxHeight="500px"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="inputs" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Input Parameters</CardTitle>
                      <CardDescription>
                        Define the inputs this agent accepts when running
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {agent.inputs.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No input parameters defined
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {agent.inputs.map((input, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{input.name}</p>
                                  <Badge variant="outline">{input.type}</Badge>
                                  {input.required && (
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                  )}
                                </div>
                                {input.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{input.description}</p>
                                )}
                                {input.default !== undefined && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Default: {JSON.stringify(input.default)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="outputs" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Output Schema</CardTitle>
                      <CardDescription>
                        Define the outputs this agent produces
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {agent.outputs.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No outputs defined
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {agent.outputs.map((output, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{output.name}</p>
                                  <Badge variant="outline">{output.type}</Badge>
                                </div>
                                {output.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{output.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="tools" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Agent Tools</CardTitle>
                      <CardDescription>
                        Tools this agent can use during execution
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {agent.tools.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No tools configured
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {agent.tools.map((tool) => (
                            <div key={tool.id} className="p-4 border rounded-lg">
                              <div className="flex items-center gap-2">
                                <Settings className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium">{tool.name}</p>
                              </div>
                              <Badge variant="secondary" className="mt-2 text-xs">
                                {tool.category}
                              </Badge>
                              {tool.description && (
                                <p className="text-sm text-muted-foreground mt-2">{tool.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="kpis" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>KPI Bindings</CardTitle>
                      <CardDescription>
                        KPIs this agent monitors and affects
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {agent.kpiBindings.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No KPIs bound
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {agent.kpiBindings.map((kpi, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                                <p className="font-medium">{kpi.kpiId}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Weight:</span>
                                <Badge variant="outline">{(kpi.weight * 100).toFixed(0)}%</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="runtime" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Runtime Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Schedule (Cron)</Label>
                          <Input 
                            value={agent.runtimeConfig.schedule || 'Not scheduled'} 
                            readOnly 
                          />
                        </div>
                        <div>
                          <Label>Max Steps</Label>
                          <Input 
                            value={agent.runtimeConfig.maxSteps || 'Unlimited'} 
                            readOnly 
                          />
                        </div>
                        <div>
                          <Label>Model Profile</Label>
                          <Input 
                            value={agent.runtimeConfig.modelProfile || 'Default'} 
                            readOnly 
                          />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Safety Rules</CardTitle>
                        <CardDescription>
                          Constraints and guardrails for this agent
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {agent.safetyRules.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">
                            No safety rules defined
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {agent.safetyRules.map((rule, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                <Shield className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                                <p className="text-sm">{rule}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="logs" className="space-y-6">
                  <AgentRunsList 
                    runs={runs} 
                    onRefresh={() => refetchRuns()}
                    showHeader={false}
                    maxHeight="600px"
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>
  );
};

export default AgentDetail;
