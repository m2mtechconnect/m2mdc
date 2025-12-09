/**
 * Scenario Picker - Select simulation scenarios
 * Displays available scenarios from template as cards or dropdown
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScenarioPickerProps {
  scenarios: any[];
  selected: any;
  onSelect: (scenario: any) => void;
}

export function ScenarioPicker({ scenarios, selected, onSelect }: ScenarioPickerProps) {
  if (scenarios.length === 0) {
    return null;
  }

  // If only one scenario, show it as selected
  if (scenarios.length === 1) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold">{scenarios[0].title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {scenarios[0].description}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multiple scenarios: show as grid
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-medium mb-1">Select Scenario</h3>
        <p className="text-xs text-muted-foreground">
          Choose a scenario to simulate different operational conditions
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {scenarios.map((scenario, index) => {
          // Add stable ID if missing
          const scenarioId = scenario.id || `scenario-${index}`;
          const selectedId = selected?.id || (selected ? `scenario-${scenarios.indexOf(selected)}` : null);
          const isSelected = selectedId === scenarioId || selected?.title === scenario.title;

          return (
            <Card
              key={scenario.id || index}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected && "border-primary/50 bg-primary/5 shadow-md"
              )}
              onClick={() => onSelect(scenario)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className={cn(
                      "h-4 w-4",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                    <h4 className="font-semibold text-sm">
                      {scenario.title}
                    </h4>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {scenario.description}
                </p>
                {scenario.metrics && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.keys(scenario.metrics).slice(0, 2).map((key) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
