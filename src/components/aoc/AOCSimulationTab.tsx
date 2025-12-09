import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Zap, AlertCircle, Clock, CheckCircle2, XCircle, Lightbulb, Sparkles } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAgentSimulations, getSimulationSuggestions } from '@/hooks/useAgentSimulations';
import { useAgentData } from '@/hooks/useAgentData';
import { formatDistanceToNow } from 'date-fns';
import { getSimulationTemplateForIndustry, getIndustryLabel } from '@/lib/simulationTemplates';

interface AOCSimulationTabProps {
  agentId: string;
}

export function AOCSimulationTab({ agentId }: AOCSimulationTabProps) {
  const [testQuery, setTestQuery] = useState('');
  const [showScenarioSummary, setShowScenarioSummary] = useState(false);
  const { data: agent } = useAgentData(agentId);
  
  // Get template_id from agent config or direct property
  const templateId = agent ? ((agent as Record<string, unknown>).template_id as string | null) || null : null;
  
  const { data: simulations = [], isLoading } = useAgentSimulations(agentId, templateId);
  
  const suggestions = agent ? getSimulationSuggestions({
    name: agent.name,
    description: agent.description,
    template_id: templateId,
  }) : [];

  // Get industry-specific simulation template
  const simulationTemplate = useMemo(() => {
    if (!agent) return null;
    // Try to get industry from agent config or metadata
    const config = agent.config as Record<string, unknown> | null;
    const metadata = config?.metadata as Record<string, unknown> | undefined;
    const industry = (config?.industry as string) || 
                     (metadata?.industry as string) ||
                     ('template_id' in agent ? agent.template_id : null) || 
                     null;
    return getSimulationTemplateForIndustry(industry);
  }, [agent]);

  const industryLabel = useMemo(() => {
    if (!agent) return 'Your Industry';
    const config = agent.config as Record<string, unknown> | null;
    const metadata = config?.metadata as Record<string, unknown> | undefined;
    const industry = (config?.industry as string) || 
                     (metadata?.industry as string) ||
                     null;
    return getIndustryLabel(industry);
  }, [agent]);

  const handleRunSimulation = () => {
    // TODO: Implement simulation logic via edge function
    console.log('Running simulation:', testQuery);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setTestQuery(suggestion);
  };

  const handleUseSampleScenario = () => {
    if (simulationTemplate) {
      setTestQuery(simulationTemplate.defaultQuery);
      setShowScenarioSummary(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
    }
  };

  const hasNoSimulations = !isLoading && simulations.length === 0;

  return (
    <div className="space-y-6">
      {/* Sample Scenario Tip Banner */}
      {hasNoSimulations && simulationTemplate && (
        <Alert className="bg-primary/5 border-primary/20">
          <Lightbulb className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              <strong>Tip:</strong> Try the recommended sample scenario for {industryLabel}.
            </span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleUseSampleScenario}
              className="ml-4 gap-2"
            >
              <Sparkles className="h-3 w-3" />
              Use Sample Scenario
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Test Query Input */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Run Simulation</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Test your agent with hypothetical scenarios and edge cases
        </p>
        
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Enter a test query or scenario..."
            value={testQuery}
            onChange={(e) => {
              setTestQuery(e.target.value);
              setShowScenarioSummary(false);
            }}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && testQuery) {
                handleRunSimulation();
              }
            }}
          />
          <Button onClick={handleRunSimulation} disabled={!testQuery}>
            <Play className="h-4 w-4 mr-2" />
            Run Test
          </Button>
        </div>

        {/* Scenario Summary when using sample */}
        {showScenarioSummary && simulationTemplate && (
          <div className="mb-3 p-3 rounded-lg bg-muted/50 border text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{simulationTemplate.title}:</span>{' '}
              {simulationTemplate.scenarioSummary}
            </p>
          </div>
        )}

        {/* Suggestion Chips */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Suggested scenarios:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs h-auto py-1.5 px-3"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Recent Simulations */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Recent Simulations</h3>
          {simulations.length > 0 && (
            <Badge variant="secondary">{simulations.length}</Badge>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50 animate-spin" />
            <p className="text-sm">Loading simulations...</p>
          </div>
        ) : simulations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No simulation runs yet</p>
            <p className="text-xs mt-1">Run a test query above to see results here</p>
            {simulationTemplate && (
              <Button 
                variant="link" 
                size="sm" 
                onClick={handleUseSampleScenario}
                className="mt-3"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Try the sample {industryLabel} scenario
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {simulations.map((sim: Record<string, unknown>) => (
              <Card key={sim.id as string} className="p-4 border-l-4 border-l-primary/30 hover:border-l-primary transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(sim.status as string)}
                    <h4 className="font-semibold text-sm">{(sim.scenario_label as string) || 'Simulation Run'}</h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {sim.duration_ms ? `${((sim.duration_ms as number) / 1000).toFixed(1)}s` : 'N/A'}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(sim.created_at as string), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {sim.input_query && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                    <span className="font-medium">Query:</span> {sim.input_query as string}
                  </p>
                )}

                {sim.output_summary && (
                  <p className="text-sm text-foreground/90 mb-2 line-clamp-2">
                    {sim.output_summary as string}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  {sim.industry && (
                    <Badge variant="outline" className="text-xs">
                      {sim.industry as string}
                    </Badge>
                  )}
                  <Badge 
                    variant={(sim.status as string) === 'completed' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {sim.status as string}
                  </Badge>
                </div>

                {sim.error && (
                  <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                    <span className="font-medium">Error:</span> {sim.error as string}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
