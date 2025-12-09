/**
 * Simulation Checklist Component
 * For Deploy page - tracks simulation readiness
 * Uses Studio design system tokens
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, PlayCircle, ChevronDown, ChevronUp, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SimulationRun {
  id: string;
  scenarioName: string;
  runAt: Date;
  duration: number;
  kpiImpacts: { label: string; delta: number }[];
}

export function SimulationChecklist() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastRun, setLastRun] = useState<SimulationRun | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    const storedRun = localStorage.getItem('lastSimulationRun');
    if (storedRun) {
      try {
        const parsed = JSON.parse(storedRun);
        const runDate = new Date(parsed.runAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - runDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          setLastRun({ ...parsed, runAt: runDate });
          setIsComplete(true);
        }
      } catch (e) {
        console.error('Failed to parse last simulation run:', e);
      }
    }
  }, []);
  
  const handleRunSimulation = () => {
    navigate('/data-centre-twin?view=simulation');
  };
  
  return (
    <Card className={`bg-card border ${isComplete ? 'border-success/30' : 'border-warning/30'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Simulation Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-warning" />
            )}
            <span className="font-medium text-card-foreground">
              {isComplete ? 'Simulation Run Complete' : 'Simulation Run Required'}
            </span>
          </div>
          <Badge variant={isComplete ? 'default' : 'secondary'} className={
            isComplete ? 'bg-success/10 text-success border-success/30' : ''
          }>
            {isComplete ? 'Passed' : 'Pending'}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {isComplete 
            ? `Last simulation ran ${formatTimeAgo(lastRun?.runAt)}. Results validated for deployment.`
            : 'Run a simulation scenario to verify system behavior before deployment.'
          }
        </p>
        
        {!isComplete ? (
          <Button onClick={handleRunSimulation} className="w-full gap-2">
            <PlayCircle className="h-4 w-4" />
            Run Simulation Now
          </Button>
        ) : (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  View Last Run Summary
                </span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              {lastRun && (
                <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Scenario</span>
                    <span className="font-medium">{lastRun.scenarioName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{formatDuration(lastRun.duration)}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-2" onClick={handleRunSimulation}>
                    Run New Simulation
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(date?: Date): string {
  if (!date) return 'Never';
  const diffMs = new Date().getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  return `${Math.floor(diffMins / 60)} hours ago`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
