/**
 * Standardized Template Preview
 * Single unified preview experience for all locations:
 * - Dashboard → Start With Template
 * - Marketplace grid & detail
 * - Builder → Preview tab
 * - Deployed Agent → Manage screen
 * 
 * Includes all required tabs:
 * - Overview
 * - Blueprint
 * - Preview (Capabilities Summary)
 * - Day in the Life
 * - Scenarios
 * - Deploy/Use
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Rocket, TrendingUp, Clock, Target, Shield, Zap, 
  Star, Download, Check, Code2, Play, FileText,
  Cloud, Workflow, Bot, MessageSquare, Layers, AlertTriangle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ValidatedTemplate } from '@/lib/templates/unifiedTemplateService';
import { trackTemplatePreview } from '@/lib/analytics/analyticsService';
import { SimulationDashboard } from '@/components/builder/step5/SimulationDashboard';
import { SovereignDCSimulationDashboard } from '@/twins/sovereignDataCenter/components/SovereignDCSimulationDashboard';
import { SovereignDCDeploymentChecklist } from '@/twins/sovereignDataCenter/components/SovereignDCDeploymentChecklist';
import { SovereignDCDeploymentSteps } from '@/twins/sovereignDataCenter/components/SovereignDCDeploymentSteps';
import { SOVEREIGN_DC_TEMPLATE_ID } from '@/twins/sovereignDataCenter/templateDefinition';
import { toast } from 'sonner';
import { AgentCard } from './blueprint/AgentCard';
import { DataSourceCard } from './blueprint/DataSourceCard';
import { IntegrationCard } from './blueprint/IntegrationCard';
import { WorkflowBlock } from './blueprint/WorkflowBlock';
import { DeploymentOverview } from './deploy/DeploymentOverview';
import { CloudProviderCard } from './deploy/CloudProviderCard';
import { DeploymentReadinessChecklist } from './deploy/DeploymentReadinessChecklist';
import { DeploymentSteps } from './deploy/DeploymentSteps';
import { HeroSummaryPanel } from './overview/HeroSummaryPanel';
import { TwoColumnSection } from './overview/TwoColumnSection';
import { KeyCapabilities } from './overview/KeyCapabilities';
import { KPIMetricCards } from './overview/KPIMetricCards';
import { ROISection } from './overview/ROISection';
import { WhoIsThisFor } from './overview/WhoIsThisFor';
import { HowItWorks } from './overview/HowItWorks';
import { FacilityStatusPanel } from './overview/FacilityStatusPanel';
import { TemplateChatInterface } from './preview/TemplateChatInterface';

interface StandardizedTemplatePreviewProps {
  template: ValidatedTemplate;
  mode: 'marketplace' | 'deployed' | 'preview';
  onDeploy?: () => void;
  onUse?: () => void;
  isDeploying?: boolean;
}

export function StandardizedTemplatePreview({
  template,
  mode,
  onDeploy,
  onUse,
  isDeploying = false,
}: StandardizedTemplatePreviewProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Track preview view
  useEffect(() => {
    trackTemplatePreview(template.id, template.name, mode);
  }, [template.id, template.name, mode]);
  
  const config = template.default_config as any || {};
  
  // Extract preview sections first (Data Centre template structure)
  const previewSections = config.preview_sections || {};
  
  // Blueprint extraction: check multiple locations for backwards compatibility
  // 1. config.blueprint_json (root level - legacy)
  // 2. config.blueprint (root level - legacy)  
  // 3. preview_sections.blueprint (current standard structure)
  const blueprintJson = config.blueprint_json || config.blueprint || previewSections.blueprint || {};
  
  const workflow = config.workflow || config.workflows || { triggers: [], actions: [], integrations: [] };
  const workflows = Array.isArray(config.workflows) ? config.workflows : (workflow ? [workflow] : []);
  const metrics = config.metrics_defaults || {};
  
  const dayInLifeSection = previewSections.day_in_the_life || {};
  const dayInLifeRoles = Array.isArray(dayInLifeSection.roles) ? dayInLifeSection.roles : [];
  const dayInLifeLegacy = config.day_in_life || ''; // fallback for older templates
  
  const scenariosSection = previewSections.scenarios || {};
  const scenarios = Array.isArray(scenariosSection.items) ? scenariosSection.items : (config.simulation_scripts || []);
  
  const cloudMetadata = config.cloud_metadata || config.cloud_deployment || {};
  
  // Extract KPI and ROI blocks
  const kpiBlock = config.kpi_block || {};
  const roiBlock = config.roi_block || {};
  const kpis = kpiBlock.kpis || config.kpis || [];
  
  // Extract agents from blueprint - check both blueprintJson and preview_sections.blueprint
  const agents = Array.isArray(blueprintJson.agents) ? blueprintJson.agents : [];
  const dataSources = Array.isArray(blueprintJson.data_sources) ? blueprintJson.data_sources : [];
  const integrations = Array.isArray(blueprintJson.integrations) ? blueprintJson.integrations : [];
  
  // Handle industries and departments (can be arrays or strings)
  const industries = Array.isArray(config.industries) ? config.industries : (template.industry ? [template.industry] : []);
  const departments = Array.isArray(config.departments) ? config.departments : (template.department ? [template.department] : []);
  
  // Calculate time saved from metrics or ROI block
  const timeSavedPerWeek = roiBlock.headline?.includes('hours') 
    ? roiBlock.headline.match(/(\d+)\s*hours?/i)?.[1] + ' hrs/week'
    : (metrics.time_saved_per_run_min && metrics.runs_per_week
      ? `${Math.round((metrics.time_saved_per_run_min * metrics.runs_per_week) / 60)} hrs/week`
      : 'N/A');
  
  // Extract ROI percentage from roi_block if available
  const roiPct = template.roi_pct || (roiBlock.example_impact_estimates?.[0]?.estimated_annual_roi_pct) || 0;
  
  // Extract preview capabilities
  const previewCapabilities = previewSections.preview_capabilities || {};
  const capabilitiesBullets = previewCapabilities.bullets || [];
  
  // Extract target users
  const targetUsers = config.target_users || config.targetUsers || [];
  
  // Extract mock data for Overview section
  const mockData = config.mock_data || {};
  const overviewMockData = mockData.overview || {};
  
  return (
    <div className="space-y-6">
      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 sticky top-0 bg-background z-10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
          <TabsTrigger value="deploy">Deploy</TabsTrigger>
        </TabsList>
        
        <ScrollArea className="h-[600px] mt-6">
          {/* Overview Tab - Complete Redesign */}
          <TabsContent value="overview" className="space-y-6">
            {/* 1. Hero Summary Panel */}
            <HeroSummaryPanel
              icon={template.icon || '🤖'}
              name={template.name}
              description={config.summary || template.description || ''}
              industries={industries}
              departments={departments}
              certified={template.certified}
              roiPct={roiPct}
              timeSaved={timeSavedPerWeek}
              downloads={template.downloads}
              onUseTemplate={mode === 'marketplace' ? onUse : undefined}
              mode={mode}
              isDeploying={isDeploying}
            />
            
            {/* Facility Status & Live KPIs (from mock data) */}
            <FacilityStatusPanel
              facilityStatus={overviewMockData.facility_status}
              kpiSnapshot={overviewMockData.kpi_snapshot}
              sampleMetrics={overviewMockData.sample_metrics}
              recentIncidents={overviewMockData.recent_incidents}
            />
            
            {/* 2. Two-Column Layout: Description + Problem Statement */}
            <TwoColumnSection
              description={config.summary || template.description}
              problemStatement={config.problem_statement}
            />
            
            {/* 3. Key Capabilities */}
            {capabilitiesBullets.length > 0 && (
              <KeyCapabilities capabilities={capabilitiesBullets} />
            )}
            
            {/* 4. KPI Metric Cards */}
            {kpis.length > 0 && (
              <KPIMetricCards kpis={kpis} />
            )}
            
            {/* 5. ROI Section */}
            {(roiBlock.headline || roiBlock.benefits || roiBlock.example_impact_estimates) && (
              <ROISection
                headline={roiBlock.headline}
                benefits={roiBlock.benefits}
                estimates={roiBlock.example_impact_estimates}
              />
            )}
            
            {/* 6. Who Is This For? */}
            {targetUsers.length > 0 && (
              <WhoIsThisFor targetUsers={targetUsers} />
            )}
            
            {/* 7. How It Works */}
            <HowItWorks />
          </TabsContent>
          
          {/* Blueprint Tab */}
          <TabsContent value="blueprint" className="space-y-6">
            {/* Visual Header */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center gap-3 mb-2">
                <Layers className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-bold">System Blueprint Overview</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                A unified view of Agents, Data Sources, Integrations, and Workflows powering this digital twin.
              </p>
            </Card>
            
            {/* Agents Section */}
            {agents.length > 0 && (
              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Agents
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Autonomous AI agents that power the digital twin's capabilities
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {agents.map((agent: any, idx: number) => (
                    <AgentCard key={idx} agent={agent} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Data Sources Section */}
            {dataSources.length > 0 && (
              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Data Sources
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    External data connections and feeds that provide real-time information
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dataSources.map((source: any, idx: number) => (
                    <DataSourceCard key={idx} source={source} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Integrations Section */}
            {integrations.length > 0 && (
              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Integrations
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Third-party services and APIs connected to the digital twin
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {integrations.map((integration: any, idx: number) => (
                    <IntegrationCard key={idx} integration={integration} />
                  ))}
                </div>
              </div>
            )}
            
            {/* System Architecture Preview */}
            <Card className="p-6 bg-muted/30">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                System Architecture (Preview)
              </h3>
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-4 text-sm">
                  <div className="px-4 py-2 bg-background border rounded-lg font-medium">
                    Data Sources
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg font-medium text-primary">
                    Agents
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="px-4 py-2 bg-background border rounded-lg font-medium">
                    Workflows
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="px-4 py-2 bg-background border rounded-lg font-medium">
                    Integrations
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Workflows Section */}
            {workflows.length > 0 && (
              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-primary" />
                    Workflows
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automated processes and decision flows that coordinate the system
                  </p>
                </div>
                <div className="space-y-3">
                  {workflows.map((wf: any, idx: number) => (
                    <WorkflowBlock key={idx} workflow={wf} index={idx} />
                  ))}
                </div>
              </div>
            )}
            
            {/* How It Works Together Narrative */}
            <Card className="p-6 bg-primary/5 border-primary/20">
              <h3 className="text-xl font-semibold mb-3">How It Works Together</h3>
              <p className="text-muted-foreground leading-relaxed">
                {previewSections.how_it_works_together || 
                  "This digital twin continuously aggregates data from operational systems, runs real-time analytics and simulations, detects risks, and generates actionable recommendations. Specialized agents collaborate to monitor key metrics, predict issues, run what-if scenarios, and support data-driven decisions across operations, compliance, and strategy."}
              </p>
            </Card>
            
            {/* View Full Blueprint JSON Toggle */}
            <Card className="p-6">
              <Button
                variant="outline"
                onClick={() => {
                  const jsonSection = document.getElementById('blueprint-json-section');
                  if (jsonSection) {
                    jsonSection.style.display = jsonSection.style.display === 'none' ? 'block' : 'none';
                  }
                }}
                className="gap-2 mb-4"
              >
                <Code2 className="h-4 w-4" />
                View Full Blueprint JSON
              </Button>
              
              <div id="blueprint-json-section" style={{ display: 'none' }}>
                <pre className="p-4 bg-muted rounded-md text-xs overflow-auto max-h-96 border">
                  {JSON.stringify(blueprintJson, null, 2)}
                </pre>
              </div>
            </Card>
          </TabsContent>
          
          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            {/* Block A - Interactive Chat Interface */}
            <TemplateChatInterface template={template} />
            
            {/* Block B - Capabilities (Card Grid) */}
            {previewCapabilities.bullets && (
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  What This Twin Can Do
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {previewCapabilities.bullets.map((bullet: string, idx: number) => {
                    // Auto-assign icons and tags based on capability content
                    let icon = Zap;
                    let tags: string[] = [];
                    const lowerBullet = bullet.toLowerCase();
                    
                    // Data Centre / HPC domain matching
                    if (lowerBullet.includes('gpu') || lowerBullet.includes('hpc') || lowerBullet.includes('workload') || lowerBullet.includes('cluster')) {
                      icon = Layers;
                      tags.push('HPC/GPU');
                    }
                    if (lowerBullet.includes('pue') || lowerBullet.includes('energy') || lowerBullet.includes('cooling')) {
                      icon = TrendingUp;
                      tags.push('Energy');
                    }
                    if (lowerBullet.includes('emission') || lowerBullet.includes('carbon') || lowerBullet.includes('net-zero') || lowerBullet.includes('greenhouse')) {
                      icon = TrendingUp;
                      tags.push('Emissions');
                    }
                    if (lowerBullet.includes('sovereign') || lowerBullet.includes('compliance') || lowerBullet.includes('pipeda') || lowerBullet.includes('residency')) {
                      icon = Shield;
                      tags.push('Compliance');
                    }
                    if (lowerBullet.includes('incident') || lowerBullet.includes('anomal') || lowerBullet.includes('alert') || lowerBullet.includes('playbook')) {
                      icon = AlertTriangle;
                      tags.push('Incidents');
                    }
                    if (lowerBullet.includes('financial') || lowerBullet.includes('npv') || lowerBullet.includes('cost') || lowerBullet.includes('investment')) {
                      icon = Target;
                      tags.push('Financial');
                    }
                    if (lowerBullet.includes('capacity') || lowerBullet.includes('expansion') || lowerBullet.includes('simulate')) {
                      icon = Layers;
                      tags.push('Capacity');
                    }
                    // Airport domain matching (legacy)
                    if (lowerBullet.includes('queue') || lowerBullet.includes('wait')) {
                      icon = Clock;
                      tags.push('Queues');
                    }
                    if (lowerBullet.includes('baggage') || lowerBullet.includes('luggage')) {
                      icon = Target;
                      tags.push('Baggage SLA');
                    }
                    if (lowerBullet.includes('irregular') || lowerBullet.includes('fog') || lowerBullet.includes('delay')) {
                      icon = AlertTriangle;
                      tags.push('Irregular Ops');
                    }
                    if (lowerBullet.includes('operational') || lowerBullet.includes('unified') || lowerBullet.includes('command')) {
                      icon = Layers;
                      tags.push('Ops Command Center');
                    }
                    if (lowerBullet.includes('airfield') || lowerBullet.includes('safety')) {
                      icon = Shield;
                      tags.push('Safety');
                    }
                    
                    const Icon = icon;
                    
                    return (
                      <div key={idx} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-foreground mb-2">{bullet}</p>
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {tags.map((tag, tagIdx) => (
                                  <Badge key={tagIdx} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Best For footer */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Best For:</span>{' '}
                    {previewCapabilities.best_for || 'Operations Managers, System Leads, Compliance Officers'}
                  </p>
                </div>
              </Card>
            )}
            
            {/* Block C - Intelligence Configuration (Human-Readable) */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                How This Twin Thinks (Intelligence Configuration)
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">LLM Provider: {config.provider || 'google'}</p>
                      <p className="text-xs text-muted-foreground">
                        → Optimized for ops-level reasoning & fast decisions.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">Model: {config.model || 'google/gemini-2.5-flash'}</p>
                      <p className="text-xs text-muted-foreground">
                        → Used for live diagnostic reasoning and scenario analysis.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">Temperature: {config.temperature || 0.7}</p>
                      <p className="text-xs text-muted-foreground">
                        → Balanced between deterministic operational decisions and creative mitigations.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">RAG Enabled: {config.rag?.provider ? 'Yes' : 'No'}</p>
                      <p className="text-xs text-muted-foreground">
                        → In production, this will connect to operational systems (telemetry, monitoring, sensors, enterprise data).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Block D - Guided Sample Queries (Prompt Buttons) */}
            {template.sample_prompts && template.sample_prompts.length > 0 && (
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-2">Try These Sample Queries</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  When chat is enabled, you'll be able to click these queries and see how the twin responds in real time.
                </p>
                <div className="space-y-3">
                  {template.sample_prompts.map((prompt: string, idx: number) => {
                    // Auto-assign category tags based on query content
                    let categoryTag = '';
                    const lowerPrompt = prompt.toLowerCase();
                    
                    // Data Centre / HPC domain
                    if (lowerPrompt.includes('gpu') || lowerPrompt.includes('cluster') || lowerPrompt.includes('utilization') || lowerPrompt.includes('workload')) {
                      categoryTag = 'HPC/GPU';
                    } else if (lowerPrompt.includes('pue') || lowerPrompt.includes('cooling') || lowerPrompt.includes('energy')) {
                      categoryTag = 'Energy';
                    } else if (lowerPrompt.includes('carbon') || lowerPrompt.includes('emission') || lowerPrompt.includes('qc') || lowerPrompt.includes('ab')) {
                      categoryTag = 'Emissions';
                    } else if (lowerPrompt.includes('sovereign') || lowerPrompt.includes('compliance') || lowerPrompt.includes('violation')) {
                      categoryTag = 'Compliance';
                    } else if (lowerPrompt.includes('tenant') || lowerPrompt.includes('onboard') || lowerPrompt.includes('capacity')) {
                      categoryTag = 'Capacity';
                    } else if (lowerPrompt.includes('incident') || lowerPrompt.includes('playbook') || lowerPrompt.includes('failure')) {
                      categoryTag = 'Incidents';
                    } else if (lowerPrompt.includes('scenario') || lowerPrompt.includes('shock') || lowerPrompt.includes('model')) {
                      categoryTag = 'Simulation';
                    // Airport domain (legacy)
                    } else if (lowerPrompt.includes('wait') || lowerPrompt.includes('queue') || lowerPrompt.includes('security') || lowerPrompt.includes('checkpoint')) {
                      categoryTag = 'Queues';
                    } else if (lowerPrompt.includes('baggage') || lowerPrompt.includes('sla')) {
                      categoryTag = 'Baggage SLA';
                    } else if (lowerPrompt.includes('fog') || lowerPrompt.includes('delay') || lowerPrompt.includes('irregular') || lowerPrompt.includes('connecting')) {
                      categoryTag = 'Irregular Ops';
                    } else if (lowerPrompt.includes('staffing') || lowerPrompt.includes('adjust')) {
                      categoryTag = 'Staffing';
                    } else if (lowerPrompt.includes('gate') || lowerPrompt.includes('connection')) {
                      categoryTag = 'Connections';
                    }
                    
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className="w-full justify-between h-auto py-3 px-4 text-left"
                        disabled
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <MessageSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span className="text-sm flex-1">{prompt}</span>
                        </div>
                        {categoryTag && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            {categoryTag}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </Card>
            )}
            
            {/* Preview Mode Disclaimer (Footer) */}
            <Card className="p-4 bg-muted/30 border-muted">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Preview Mode Only</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {previewCapabilities.preview_disclaimer || 
                      `This preview demonstrates the twin's logic and capabilities. In production, responses will be grounded to live operational systems including real-time telemetry, monitoring data, and enterprise integrations.`}
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
          
          {/* Simulation Tab - Uses enhanced dashboard for Sovereign DC */}
          <TabsContent value="simulation" className="space-y-4 mt-0">
            {template.id === SOVEREIGN_DC_TEMPLATE_ID ? (
              <SovereignDCSimulationDashboard />
            ) : (
              <SimulationDashboard
                template={template}
                mode={mode === 'deployed' ? 'manage' : 'preview'}
                onDeploy={mode === 'deployed' ? onDeploy : undefined}
                isDeploying={isDeploying}
              />
            )}
          </TabsContent>
          
          {/* Deploy Tab - Uses twin-specific components for Sovereign DC */}
          <TabsContent value="deploy" className="space-y-6">
            {template.id === SOVEREIGN_DC_TEMPLATE_ID ? (
              <>
                {/* Sovereign DC Twin-Specific Deployment */}
                <DeploymentOverview 
                  templateName={template.name}
                  description="Deploy this Sovereign Green AI Data Centre Twin to Canadian cloud regions with full data sovereignty, emissions tracking, and operational workflows. The deployment orchestrator ensures all telemetry, AI models, and compliance checks are properly configured."
                />
                
                {/* Cloud Provider Cards with twin-specific services */}
                {cloudMetadata && Object.keys(cloudMetadata).length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">Canadian Cloud Regions</h3>
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Sovereignty Certified
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {cloudMetadata.aws && (
                        <CloudProviderCard provider="aws" data={cloudMetadata.aws} />
                      )}
                      {cloudMetadata.azure && (
                        <CloudProviderCard provider="azure" data={cloudMetadata.azure} />
                      )}
                      {cloudMetadata.gcp && (
                        <CloudProviderCard provider="gcp" data={cloudMetadata.gcp} />
                      )}
                    </div>
                  </div>
                )}
                
                {/* Twin-Specific Readiness Checklist */}
                <SovereignDCDeploymentChecklist 
                  template={template}
                  onFixIssue={(step) => {
                    toast.info(`Navigate to Builder Step ${step} to configure this requirement.`);
                  }}
                />
                
                {/* Twin-Specific Deployment Steps */}
                <SovereignDCDeploymentSteps 
                  template={template}
                  isDeploying={isDeploying}
                  onDeploy={onDeploy}
                />
              </>
            ) : (
              <>
                {/* Generic Deployment for other templates */}
                <DeploymentOverview 
                  templateName={template.name}
                  description={previewSections.deploy?.content}
                />
                
                {cloudMetadata && Object.keys(cloudMetadata).length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">Cloud Provider Options</h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {cloudMetadata.aws && (
                        <CloudProviderCard provider="aws" data={cloudMetadata.aws} />
                      )}
                      {cloudMetadata.azure && (
                        <CloudProviderCard provider="azure" data={cloudMetadata.azure} />
                      )}
                      {cloudMetadata.gcp && (
                        <CloudProviderCard provider="gcp" data={cloudMetadata.gcp} />
                      )}
                    </div>
                  </div>
                )}
                
                <DeploymentReadinessChecklist 
                  template={template}
                  onFixIssue={(step) => {
                    toast.info(`Please navigate to Step ${step} in the Builder to fix this issue.`);
                  }}
                />
                
                <DeploymentSteps 
                  template={template}
                  isDeploying={isDeploying}
                  onDeploy={onDeploy}
                />
              </>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
