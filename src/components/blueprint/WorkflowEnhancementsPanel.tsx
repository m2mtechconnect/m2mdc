/**
 * Workflow Enhancements Panel
 * Simulation preview, version control, impact analysis
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Workflow, 
  Play, 
  GitBranch, 
  BarChart3,
  Clock,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowVersion {
  id: string;
  version: string;
  timestamp: Date;
  author: string;
  changes: string[];
  isCurrent: boolean;
}

interface WorkflowImpact {
  kpi: string;
  expectedChange: number;
  confidence: number;
  direction: 'up' | 'down';
}

interface WorkflowPreviewStep {
  id: string;
  action: string;
  target: string;
  condition?: string;
  duration: string;
}

interface WorkflowEnhancementsPanelProps {
  workflowId?: string;
  workflowName?: string;
  className?: string;
}

// Mock data
const MOCK_VERSIONS: WorkflowVersion[] = [
  { 
    id: 'v3', 
    version: '3.0.0', 
    timestamp: new Date(), 
    author: 'System', 
    changes: ['Added thermal failsafe', 'Improved response time'],
    isCurrent: true 
  },
  { 
    id: 'v2', 
    version: '2.1.0', 
    timestamp: new Date(Date.now() - 86400000), 
    author: 'Admin', 
    changes: ['Adjusted thresholds', 'Added logging'],
    isCurrent: false 
  },
  { 
    id: 'v1', 
    version: '1.0.0', 
    timestamp: new Date(Date.now() - 172800000), 
    author: 'System', 
    changes: ['Initial version'],
    isCurrent: false 
  },
];

const MOCK_IMPACTS: WorkflowImpact[] = [
  { kpi: 'PUE', expectedChange: -3.5, confidence: 85, direction: 'down' },
  { kpi: 'Thermal Stability', expectedChange: 8.2, confidence: 78, direction: 'up' },
  { kpi: 'GPU Utilization', expectedChange: -2.1, confidence: 72, direction: 'down' },
  { kpi: 'Carbon Intensity', expectedChange: -4.8, confidence: 80, direction: 'down' },
];

const MOCK_PREVIEW_STEPS: WorkflowPreviewStep[] = [
  { id: '1', action: 'Detect', target: 'Thermal anomaly in Zone A', condition: 'temp > 28°C', duration: '0s' },
  { id: '2', action: 'Alert', target: 'Notify Ops team', duration: '1s' },
  { id: '3', action: 'Analyze', target: 'Identify affected racks', duration: '5s' },
  { id: '4', action: 'Mitigate', target: 'Increase cooling to Zone A', condition: 'if available capacity', duration: '10s' },
  { id: '5', action: 'Redistribute', target: 'Move 20% load to Zone B', condition: 'if cooling insufficient', duration: '30s' },
  { id: '6', action: 'Verify', target: 'Confirm temp normalized', duration: '60s' },
];

export function WorkflowEnhancementsPanel({ 
  workflowId, 
  workflowName = 'Thermal Response Workflow',
  className 
}: WorkflowEnhancementsPanelProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const runPreview = () => {
    setIsSimulating(true);
    setCurrentStep(0);
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= MOCK_PREVIEW_STEPS.length - 1) {
          clearInterval(interval);
          setIsSimulating(false);
          return -1;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-4 w-4 text-primary" />
            {workflowName}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            v{MOCK_VERSIONS[0].version}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 h-8 mb-3">
            <TabsTrigger value="preview" className="text-xs">
              <Play className="h-3 w-3 mr-1" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="versions" className="text-xs">
              <GitBranch className="h-3 w-3 mr-1" />
              Versions
            </TabsTrigger>
            <TabsTrigger value="impact" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Impact
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-0">
            <div className="space-y-3">
              <Button 
                onClick={runPreview}
                disabled={isSimulating}
                size="sm"
                className="w-full"
              >
                {isSimulating ? (
                  <>
                    <Clock className="h-3 w-3 mr-2 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-2" />
                    Run Preview Simulation
                  </>
                )}
              </Button>

              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {MOCK_PREVIEW_STEPS.map((step, i) => (
                    <div 
                      key={step.id}
                      className={cn(
                        "flex items-start gap-3 p-2 rounded-lg border transition-all",
                        currentStep === i && "bg-primary/10 border-primary",
                        currentStep > i && "bg-success/10 border-success/20",
                        currentStep < i && "bg-muted/30 border-border"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                        currentStep === i && "bg-primary text-primary-foreground",
                        currentStep > i && "bg-success text-success-foreground",
                        currentStep < i && "bg-muted text-muted-foreground"
                      )}>
                        {currentStep > i ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{step.action}</span>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {step.duration}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{step.target}</p>
                        {step.condition && (
                          <p className="text-xs text-info italic mt-0.5">{step.condition}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="versions" className="mt-0">
            <ScrollArea className="h-56">
              <div className="space-y-2">
                {MOCK_VERSIONS.map((version) => (
                  <div 
                    key={version.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      version.isCurrent ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">v{version.version}</span>
                        {version.isCurrent && (
                          <Badge className="text-[10px] h-4">Current</Badge>
                        )}
                      </div>
                      {!version.isCurrent && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Rollback
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(version.timestamp)} by {version.author}
                    </p>
                    <div className="mt-2 space-y-1">
                      {version.changes.map((change, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          {change}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="impact" className="mt-0">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                Predicted KPI changes when this workflow executes:
              </p>
              
              {MOCK_IMPACTS.map((impact, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <span className="text-sm font-medium">{impact.kpi}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-mono",
                      impact.direction === 'down' ? 'text-success' : 'text-warning'
                    )}>
                      {impact.expectedChange > 0 ? '+' : ''}{impact.expectedChange}%
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4">
                      {impact.confidence}% conf
                    </Badge>
                  </div>
                </div>
              ))}
              
              <div className="mt-3 p-2 rounded-lg bg-info/10 border border-info/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-info shrink-0 mt-0.5" />
                  <p className="text-xs text-info">
                    Impact predictions are based on historical data and may vary with actual conditions.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
