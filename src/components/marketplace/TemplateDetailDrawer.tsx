import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  FileCode, 
  GitBranch, 
  MessageSquare, 
  Play, 
  TrendingUp,
  CheckCircle2,
  Database,
  Zap,
  Box,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/telemetry';
import { GeminiChatInterface } from './GeminiChatInterface';
import { startBuilderFromTemplate } from '@/lib/intake';

interface TemplateDetailDrawerProps {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateDetailDrawer({ template, open, onOpenChange }: TemplateDetailDrawerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  if (!template) return null;

  const handleUseTemplate = async () => {
    try {
      trackEvent('marketplace.template.use', { id: template.id, name: template.name });
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast({ title: "Error", description: "Please sign in to continue", variant: "destructive" });
        return;
      }
      const result = await startBuilderFromTemplate(template.id, user.id, 'marketplace');
      if (result.success) {
        navigate(result.builderUrl);
        onOpenChange(false);
      } else {
        toast({ title: "Error", description: result.error || 'Failed to load template', variant: "destructive" });
      }
    } catch (error) {
      console.error('Failed to use template:', error);
      toast({ title: 'Error', description: 'Failed to load template in Builder', variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-4xl mb-2">{template.hero_icon || '🤖'}</div>
              <SheetTitle className="text-2xl">{template.name}</SheetTitle>
              <SheetDescription className="mt-2">
                {template.description || 'Enterprise Digital Twin template with AI-powered automation'}
              </SheetDescription>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline">{template.industry}</Badge>
                {(template as any).department && (
                  <Badge variant="outline">{(template as any).department}</Badge>
                )}
                {(template as any).twin_type && (
                  <Badge variant="secondary">
                    {(template as any).twin_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Badge>
                )}
                {template.certified && (
                  <Badge variant="default">✓ Certified</Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-6" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Template description, ROI, and key features</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Workflow structure, triggers, data sources, and KPIs</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="preview">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Preview
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Chat with the Digital Twin, run simulations, and test scenarios</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI-recommended test scenarios and use cases</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="deploy">Deploy</TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure and deploy this template to your workspace</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TabsList>

          {/* Section 1: Overview */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                What It Does
              </h3>
              <p className="text-muted-foreground">
                {template.description || 'This Digital Twin automates complex workflows and mirrors real-world business processes with AI-powered decision-making.'}
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Business Impact
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-primary">{template.roi_pct || 250}%</p>
                  <p className="text-sm text-muted-foreground">Estimated ROI</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{template.downloads || 1200}</p>
                  <p className="text-sm text-muted-foreground">Deployments</p>
                </div>
              </div>
            </Card>

            {template.kpi_definitions && template.kpi_definitions.length > 0 && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  KPIs Improved
                </h3>
                <div className="space-y-2">
                  {template.kpi_definitions.map((kpi: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{kpi.name || kpi}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Section 2: Blueprint Structure */}
          <TabsContent value="blueprint" className="space-y-6 mt-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Workflow Structure
              </h3>
              <p className="text-sm text-muted-foreground">
                Process Mirrored: {(template.blueprint as any)?.process_mirrored || 'End-to-end business process automation'}
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">Steps:</p>
                {(template.blueprint as any)?.workflow_steps?.map((step: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{i + 1}</Badge>
                    <span>{step.label || step}</span>
                  </div>
                )) || <p className="text-sm text-muted-foreground">Workflow details will be available in Phase 3</p>}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Event Triggers
              </h3>
              <div className="flex flex-wrap gap-2">
                {(template.blueprint as any)?.event_triggers?.map((trigger: string, i: number) => (
                  <Badge key={i} variant="secondary">{trigger}</Badge>
                )) || <Badge variant="secondary">Configurable triggers</Badge>}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Sources & Integrations
              </h3>
              <div className="flex flex-wrap gap-2">
                {(template.blueprint as any)?.integrations?.map((integration: string, i: number) => (
                  <Badge key={i} variant="outline">{integration}</Badge>
                )) || <Badge variant="outline">Multiple integrations supported</Badge>}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Box className="h-5 w-5" />
                Blueprint JSON
              </h3>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(template.blueprint || { status: 'Available in Phase 3' }, null, 2)}
              </pre>
            </Card>
          </TabsContent>

          {/* Section 3: Interactive Preview (Gemini-powered) */}
          <TabsContent value="preview" className="space-y-6 mt-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat With This Digital Twin
              </h3>
              <p className="text-sm text-muted-foreground">
                Powered by Gemini 2.5 Flash - Ask questions about capabilities, workflows, and limitations
              </p>
              <GeminiChatInterface templateContext={template} />
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Play className="h-5 w-5" />
                Run Simulation
              </h3>
              <p className="text-sm text-muted-foreground">
                Test the Digital Twin with various scenarios: normal workloads, stress conditions, edge cases
              </p>
              <Button variant="outline" className="w-full">
                Start Simulation (Coming in Phase 4)
              </Button>
            </Card>
          </TabsContent>

          {/* Section 4: Recommended Scenarios */}
          <TabsContent value="scenarios" className="space-y-6 mt-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">AI-Recommended Scenarios</h3>
              <p className="text-sm text-muted-foreground">
                Gemini-generated test scenarios based on industry best practices
              </p>
              <div className="space-y-2">
                <div className="p-4 border border-border rounded-lg">
                  <p className="font-medium text-sm">Scenario 1: High Volume Processing</p>
                  <p className="text-xs text-muted-foreground mt-1">Test how the twin handles peak loads</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="font-medium text-sm">Scenario 2: Error Recovery</p>
                  <p className="text-xs text-muted-foreground mt-1">Validate exception handling and failover</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="font-medium text-sm">Scenario 3: Multi-Integration Flow</p>
                  <p className="text-xs text-muted-foreground mt-1">Test complex data flow across systems</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Section 5: Deploy (Builder Integration) */}
          <TabsContent value="deploy" className="space-y-6 mt-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Deploy to Your Workspace</h3>
              <p className="text-sm text-muted-foreground">
                Using this template will auto-populate the Builder with:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Step 1: Summary & Configuration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Step 2: Intelligence Settings (LLM, RAG, Grounding)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Step 3: Tools & MCP Integrations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Step 4: Workflow Nodes (Pre-built)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Step 5: Simulation & Testing
                </li>
              </ul>
              <Button onClick={handleUseTemplate} className="w-full" size="lg">
                Use This Template
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
