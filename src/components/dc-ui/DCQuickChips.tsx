/**
 * DC-Specific Quick Action Chips
 * Used in SmartAgentInput and CoPilot panel for data center domain queries
 */

import { Thermometer, Cpu, Zap, Leaf, Shield, Wind, Battery, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DCQuickChip {
  id: string;
  label: string;
  query: string;
  icon: typeof Thermometer;
  category: 'thermal' | 'power' | 'gpu' | 'carbon' | 'sovereignty' | 'cooling';
}

export const DC_QUICK_CHIPS: DCQuickChip[] = [
  {
    id: 'pue-drift',
    label: 'Explain PUE drift',
    query: 'Explain the current PUE drift pattern in our data center. What factors are contributing to the drift and how can we stabilize it?',
    icon: Zap,
    category: 'power',
  },
  {
    id: 'gpu-saturation',
    label: 'GPU saturation forecast',
    query: 'Provide a forecast for GPU saturation over the next 24 hours. Identify any clusters at risk of reaching capacity limits.',
    icon: Cpu,
    category: 'gpu',
  },
  {
    id: 'cooling-diagnosis',
    label: 'Cooling efficiency diagnosis',
    query: 'Diagnose the current cooling efficiency across all zones. Identify any thermal imbalances or CRAC units underperforming.',
    icon: Wind,
    category: 'cooling',
  },
  {
    id: 'carbon-trend',
    label: 'Carbon intensity trend',
    query: 'Analyze the carbon intensity trend for our data center operations. What is the gCO₂e/kWh and how does it compare to our targets?',
    icon: Leaf,
    category: 'carbon',
  },
  {
    id: 'ups-runtime',
    label: 'UPS battery runtime check',
    query: 'Check the current UPS battery runtime status across all banks. Are there any batteries that need replacement or are below threshold?',
    icon: Battery,
    category: 'power',
  },
  {
    id: 'sovereignty-audit',
    label: 'Sovereign routing audit',
    query: 'Audit the current sovereign data routing. Are there any jurisdiction violations or data residency concerns that need attention?',
    icon: Shield,
    category: 'sovereignty',
  },
  {
    id: 'thermal-imbalance',
    label: 'Thermal zone imbalance',
    query: 'Identify any thermal zone imbalances in the data center. Which racks have hotspots and what mitigation actions are recommended?',
    icon: Thermometer,
    category: 'thermal',
  },
  {
    id: 'workload-optimize',
    label: 'Optimize cluster workload',
    query: 'Analyze the current workload distribution across GPU clusters. Recommend optimizations to balance load and reduce energy consumption.',
    icon: BarChart3,
    category: 'gpu',
  },
];

interface DCQuickChipsProps {
  onChipClick: (query: string) => void;
  variant?: 'compact' | 'full';
  maxChips?: number;
}

export function DCQuickChips({ onChipClick, variant = 'compact', maxChips = 4 }: DCQuickChipsProps) {
  const chipsToShow = DC_QUICK_CHIPS.slice(0, maxChips);

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap gap-2">
        {chipsToShow.map((chip) => {
          const IconComp = chip.icon;
          return (
            <Button
              key={chip.id}
              variant="outline"
              size="sm"
              onClick={() => onChipClick(chip.query)}
              className="h-7 text-xs bg-muted/50 border-border hover:bg-muted hover:border-primary/30"
            >
              <IconComp className="h-3 w-3 mr-1.5" />
              {chip.label}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {DC_QUICK_CHIPS.map((chip) => {
        const IconComp = chip.icon;
        return (
          <Button
            key={chip.id}
            variant="outline"
            size="sm"
            onClick={() => onChipClick(chip.query)}
            className="h-auto py-2 px-3 justify-start text-left bg-muted/50 border-border hover:bg-muted hover:border-primary/30"
          >
            <IconComp className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-xs">{chip.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
