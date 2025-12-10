/**
 * DC Twin Simulation Tab
 * Shows scenarios from builder store with simulation controls
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle, Pause, RotateCcw, Clock, AlertTriangle, 
  Zap, Leaf, Shield, TrendingUp, Server
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';
import type { DCScenarioCategory } from '@/types/dcTwinBuilder';

const categoryIcons: Record<DCScenarioCategory, React.ReactNode> = {
  capacity: <Server className="h-4 w-4" />,
  incident: <AlertTriangle className="h-4 w-4" />,
  emissions: <Leaf className="h-4 w-4" />,
  compliance: <Shield className="h-4 w-4" />,
  optimization: <TrendingUp className="h-4 w-4" />,
};

const severityColors: Record<string, string> = {
  critical: 'border-destructive/50 bg-destructive/5',
  warning: 'border-warning/50 bg-warning/5',
  info: 'border-info/50 bg-info/5',
};

export function DCSimulationTab() {
  const { overview, scenarios, kpis } = useDCTwinBuilderStore();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const enabledScenarios = scenarios.filter(s => s.enabled);
  const activeScenario = scenarios.find(s => s.id === selectedScenario);
  
  const handleRunScenario = () => {
    if (selectedScenario) {
      setIsRunning(true);
      // In real implementation, this would trigger the simulation engine
      console.log('Running scenario:', selectedScenario);
    }
  };
  
  const handlePause = () => {
    setIsRunning(false);
  };
  
  const handleReset = () => {
    setIsRunning(false);
    setSelectedScenario(null);
  };
  
  return (
    <div className="space-y-6">
      {/* Facility Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{overview.twinName}</h2>
              <p className="text-sm text-muted-foreground">
                {overview.facilityLocation} • {overview.renewablePercent}% Renewable • {overview.sovereignCompliance ? 'Sovereign Compliant' : 'Standard'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{overview.tier}</Badge>
              <Badge variant="outline">{overview.capacityKw.toLocaleString()} kW</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Simulation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Simulation Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleRunScenario} 
              disabled={!selectedScenario || isRunning}
              className="gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              Run Scenario
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePause}
              disabled={!isRunning}
              className="gap-2"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            
            {activeScenario && (
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Duration: {Math.floor(activeScenario.durationSeconds / 60)}m {activeScenario.durationSeconds % 60}s
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Scenario Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Available Scenarios ({enabledScenarios.length})</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {enabledScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(scenario.id)}
              className={`text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                selectedScenario === scenario.id 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : severityColors[scenario.severity] || 'border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 rounded-lg bg-muted">
                  {categoryIcons[scenario.category]}
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] ${
                    scenario.severity === 'critical' ? 'text-destructive' :
                    scenario.severity === 'warning' ? 'text-warning' : 'text-info'
                  }`}
                >
                  {scenario.severity}
                </Badge>
              </div>
              
              <h4 className="font-semibold text-sm mb-1">{scenario.name}</h4>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{scenario.description}</p>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.floor(scenario.durationSeconds / 60)}m
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {scenario.eventsCount} events
                </span>
              </div>
              
              {scenario.kpisImpacted.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {scenario.kpisImpacted.slice(0, 2).map((kpi, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px]">{kpi}</Badge>
                  ))}
                  {scenario.kpisImpacted.length > 2 && (
                    <Badge variant="secondary" className="text-[9px]">+{scenario.kpisImpacted.length - 2}</Badge>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* KPI Values */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current KPI Values</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {kpis.filter(k => k.enabled).slice(0, 12).map((kpi) => (
              <div key={kpi.id} className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1 truncate">{kpi.name}</p>
                <p className="text-lg font-mono font-bold">
                  {kpi.target} <span className="text-xs text-muted-foreground">{kpi.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
