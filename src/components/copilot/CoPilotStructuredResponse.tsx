/**
 * Co-Pilot Structured Response
 * 
 * Renders the 4-section structured layout:
 * (A) Immediate Actions
 * (B) Insights
 * (C) Recommended Next Steps
 * (D) Follow-Up Questions
 * 
 * Now supports command execution for DC-specific actions.
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Wrench, 
  PlayCircle, 
  Plus, 
  Settings, 
  ExternalLink,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Pause,
  RotateCcw,
  Thermometer,
  Zap,
  Wind,
  Network,
  Globe,
  DollarSign,
  Cpu,
  Map,
  Activity
} from 'lucide-react';

interface StructuredResponseData {
  actions?: Array<{ label: string; handler: string; icon?: string }>;
  insights?: string[];
  nextSteps?: string[];
  followUps?: string[];
}

interface CoPilotStructuredResponseProps {
  data: StructuredResponseData;
  onActionClick: (action: any) => void;
  onFollowUpClick: (question: string) => void;
}

// Extended icon map for DC domain actions
const iconMap: Record<string, any> = {
  wrench: Wrench,
  play: PlayCircle,
  plus: Plus,
  settings: Settings,
  external: ExternalLink,
  pause: Pause,
  reset: RotateCcw,
  thermal: Thermometer,
  power: Zap,
  cooling: Wind,
  network: Network,
  sovereignty: Globe,
  financial: DollarSign,
  workload: Cpu,
  navigate: Map,
  activity: Activity,
};

export function CoPilotStructuredResponse({
  data,
  onActionClick,
  onFollowUpClick,
}: CoPilotStructuredResponseProps) {
  const { actions = [], insights = [], nextSteps = [], followUps = [] } = data;

  return (
    <div className="mt-3 space-y-3">
      {/* (A) Immediate Actions */}
      {actions.length > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Immediate Actions</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.map((action, idx) => {
              const Icon = action.icon ? iconMap[action.icon] || Wrench : Wrench;
              return (
                <Button
                  key={idx}
                  variant="secondary"
                  size="sm"
                  onClick={() => onActionClick(action)}
                  className="gap-2"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </Card>
      )}

      {/* (B) Insights */}
      {insights.length > 0 && (
        <Card className="p-3 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold">Insights</h4>
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-amber-500">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* (C) Recommended Next Steps */}
      {nextSteps.length > 0 && (
        <Card className="p-3 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-semibold">Recommended Next Steps</h4>
          </div>
          <ol className="space-y-1.5 text-sm text-muted-foreground">
            {nextSteps.map((step, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-blue-500 font-semibold">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* (D) Follow-Up Questions */}
      {followUps.length > 0 && (
        <Card className="p-3 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-4 w-4 text-purple-500" />
            <h4 className="text-sm font-semibold">Follow-Up Questions</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {followUps.map((question, idx) => (
              <Button
                key={idx}
                variant="ghost"
                size="sm"
                onClick={() => onFollowUpClick(question)}
                className="h-auto py-1.5 px-3 text-xs text-left justify-start whitespace-normal"
              >
                {question}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
