/**
 * Agent Scenario Modal
 * Allows testing scenarios per subsystem agent
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Activity, PlayCircle } from 'lucide-react';
import { PRESET_SCENARIOS } from '@/simulation/scenarioRegistry';

interface AgentScenarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
}

export function AgentScenarioModal({ open, onOpenChange, agentId, agentName }: AgentScenarioModalProps) {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<string>('');

  const handleRunSimulation = () => {
    if (selectedScenario) {
      // TODO: When simulation engine supports URL params for deeper integration,
      // pass agentId and scenarioId to pre-configure the simulation
      navigate(`/data-centre-twin?view=simulation&scenarioId=${selectedScenario}&agentId=${agentId}`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Test Scenario for {agentName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Scenario</Label>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a scenario to test..." />
              </SelectTrigger>
              <SelectContent>
                {PRESET_SCENARIOS.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    <div className="flex flex-col">
                      <span>{scenario.name}</span>
                      <span className="text-xs text-muted-foreground">{scenario.category}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedScenario && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                {PRESET_SCENARIOS.find(s => s.id === selectedScenario)?.description}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRunSimulation} disabled={!selectedScenario} className="gap-2">
            <PlayCircle className="h-4 w-4" />
            Run in Simulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
