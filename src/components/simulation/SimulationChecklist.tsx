/**
 * Simulation Checklist Component
 * For Deploy page - tracks simulation readiness
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, PlayCircle, ChevronDown, ChevronUp, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DCCard } from '@/components/dc-ui/DCCard';

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
    // Check localStorage for last simulation run
    const storedRun = localStorage.getItem('lastSimulationRun');
    if (storedRun) {
      try {
        const parsed = JSON.parse(storedRun);
        const runDate = new Date(parsed.runAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - runDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          setLastRun({
            ...parsed,
            runAt: runDate,
          });
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
    <DCCard 
      title="Simulation Verification" 
      icon={<Activity className="h-4 w-4" />}
      status={isComplete ? 'normal' : 'warning'}
      className="p-4"
    >
      <div className="space-y-3">
        {/* Status Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-amber-500" />
            )}
            <span className="font-medium">
              {isComplete ? 'Simulation Run Complete' : 'Simulation Run Required'}
            </span>
          </div>
          <Badge variant={isComplete ? 'default' : 'secondary'} className={
            isComplete ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''
          }>
            {isComplete ? 'Passed' : 'Pending'}
          </Badge>
        </div>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground">
          {isComplete 
            ? `Last simulation ran ${formatTimeAgo(lastRun?.runAt)}. Results validated for deployment.`
            : 'Run a simulation scenario to verify system behavior before deployment.'
          }
        </p>
        
        {/* Action Button or Last Run Summary */}
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Run Time</span>
                    <span className="font-medium">{formatTimeAgo(lastRun.runAt)}</span>
                  </div>
                  
                  {lastRun.kpiImpacts.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground mb-1">KPI Impacts</div>
                      <div className="grid grid-cols-2 gap-1">
                        {lastRun.kpiImpacts.slice(0, 4).map((impact, idx) => (
                          <div key={idx} className="text-xs flex justify-between">
                            <span>{impact.label}</span>
                            <span className={impact.delta > 0 ? 'text-green-500' : 'text-red-500'}>
                              {impact.delta > 0 ? '+' : ''}{impact.delta.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={handleRunSimulation}
                  >
                    Run New Simulation
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </DCCard>
  );
}

function formatTimeAgo(date?: Date): string {
  if (!date) return 'Never';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return date.toLocaleDateString();
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
