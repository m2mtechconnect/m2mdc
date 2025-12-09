import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import type { DeployedSystem } from '@/types/system';

interface SystemSimulationProps {
  system: DeployedSystem;
}

export function SystemSimulation({ system }: SystemSimulationProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <Play className="h-5 w-5 text-primary mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">Run Simulation</h3>
          <p className="text-sm text-muted-foreground">
            Test the Digital Twin with various scenarios: normal workloads, stress conditions, edge cases
          </p>
        </div>
      </div>

      <Button 
        className="w-full" 
        variant="outline"
        disabled
      >
        Start Simulation (Coming in Phase 4)
      </Button>
    </Card>
  );
}
