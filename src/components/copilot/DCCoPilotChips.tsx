/**
 * DC Domain-Specific CoPilot Quick Chips
 * 
 * Dynamic suggestion chips that update based on current page/tab context
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Zap, Cpu, Thermometer, Shield, Leaf, DollarSign, 
  AlertTriangle, Play, Map, Users, GitBranch, CheckCircle,
  Wrench, Plus, Wind, Battery, Activity, BarChart, Clock, Scale, Globe, TrendingDown
} from 'lucide-react';
import { getDCQuickChips } from '@/lib/copilot/dcDomainContext';

interface DCCoPilotChipsProps {
  pageContext: string;
  activeTab: string;
  onChipClick: (query: string) => void;
  maxChips?: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'zap': Zap,
  'cpu': Cpu,
  'thermometer': Thermometer,
  'shield': Shield,
  'leaf': Leaf,
  'dollar-sign': DollarSign,
  'alert-triangle': AlertTriangle,
  'play': Play,
  'map': Map,
  'users': Users,
  'git-branch': GitBranch,
  'check-circle': CheckCircle,
  'wrench': Wrench,
  'plus': Plus,
  'wind': Wind,
  'battery': Battery,
  'activity': Activity,
  'bar-chart': BarChart,
  'clock': Clock,
  'scale': Scale,
  'globe': Globe,
  'trending-down': TrendingDown,
  'file-text': AlertTriangle, // fallback
  'trending-up': TrendingDown,
  'alert-circle': AlertTriangle,
  'fan': Wind,
};

export function DCCoPilotChips({ 
  pageContext, 
  activeTab, 
  onChipClick, 
  maxChips = 6 
}: DCCoPilotChipsProps) {
  const chips = getDCQuickChips(pageContext, activeTab).slice(0, maxChips);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-border bg-muted/10">
      {chips.map((chip, idx) => {
        const Icon = chip.icon ? iconMap[chip.icon] || Zap : Zap;
        
        return (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium gap-1.5 hover:bg-primary/10 hover:border-primary/40"
            onClick={() => onChipClick(chip.query)}
          >
            <Icon className="h-3 w-3" />
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function DCCoPilotChipsCompact({ 
  pageContext, 
  activeTab, 
  onChipClick 
}: Omit<DCCoPilotChipsProps, 'maxChips'>) {
  const chips = getDCQuickChips(pageContext, activeTab).slice(0, 4);

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip, idx) => (
        <Badge
          key={idx}
          variant="outline"
          className="cursor-pointer hover:bg-primary/10 text-xs"
          onClick={() => onChipClick(chip.query)}
        >
          {chip.label}
        </Badge>
      ))}
    </div>
  );
}
