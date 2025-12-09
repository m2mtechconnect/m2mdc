import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Beaker, Play, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AOCSimulationSandboxProps {
  agentId: string;
}

export function AOCSimulationSandbox({ agentId }: AOCSimulationSandboxProps) {
  const [testQuery, setTestQuery] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();

  const handleRunTest = async () => {
    if (!testQuery.trim()) {
      toast({
        title: '⚠️ No Query',
        description: 'Please enter a test query',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    setLastResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('aoc-simulate-test', {
        body: { agentId, testQuery },
      });

      if (error) throw error;

      setLastResult(data.data);
      trackEvent('simulation_run', { 
        agentId, 
        status: data.data.status, 
        duration: data.data.duration 
      });
      toast({
        title: data.data.status === 'completed' ? '✅ Test Completed' : '❌ Test Failed',
        description: data.data.status === 'completed' 
          ? `Test ran in ${data.data.duration}ms` 
          : data.data.error,
        variant: data.data.status === 'completed' ? 'default' : 'destructive',
      });
    } catch (err: any) {
      toast({
        title: '❌ Test Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-b">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <Beaker className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Simulation & Testing</h3>
      </div>

      {/* Sandbox */}
      <div className="flex-1 p-3 overflow-auto">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              Test Query
            </label>
            <Textarea
              placeholder="Enter a test query or scenario..."
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              className="text-xs resize-none"
              rows={4}
            />
          </div>

          <Button 
            size="sm" 
            className="w-full" 
            onClick={handleRunTest}
            disabled={isRunning || !testQuery.trim()}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-2" />
                Run Test
              </>
            )}
          </Button>

          {/* Last Result */}
          {lastResult && (
            <Card className={`p-3 ${lastResult.status === 'completed' ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={lastResult.status === 'completed' ? 'default' : 'destructive'}>
                    {lastResult.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {lastResult.duration}ms
                  </span>
                </div>
                {lastResult.output && (
                  <p className="text-xs">{lastResult.output}</p>
                )}
                {lastResult.error && (
                  <p className="text-xs text-destructive">{lastResult.error}</p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
