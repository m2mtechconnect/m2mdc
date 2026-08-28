import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Zap, Users, LineChart, X } from 'lucide-react';
import { useState } from 'react';

interface AOCIntroCardProps {
  onDismiss?: () => void;
}

/**
 * Introduction card explaining AOC features
 * Shows on first visit to agents page
 */
export function AOCIntroCard({ onDismiss }: AOCIntroCardProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('aoc-intro-dismissed') === 'true';
  });

  const handleDismiss = () => {
    localStorage.setItem('aoc-intro-dismissed', 'true');
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  return (
    <Card className="p-6 mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg">Agent operations overview</p>
            <p className="text-sm text-muted-foreground">
              Available controls, activity, metrics and collaboration context for configured agents
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-8 w-8 p-0"
          aria-label="Dismiss introduction"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded bg-blue-500/10">
            <Zap className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="font-medium text-sm">Agent controls</p>
            <p className="text-xs text-muted-foreground">
              Inspect the controls available for each agent
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded bg-green-500/10">
            <Activity className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <p className="font-medium text-sm">Activity evidence</p>
            <p className="text-xs text-muted-foreground">
              Review recorded activity and current state
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded bg-info/10">
            <LineChart className="h-4 w-4 text-info" />
          </div>
          <div>
            <p className="font-medium text-sm">Performance Metrics</p>
            <p className="text-xs text-muted-foreground">
              Review available success and latency evidence
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded bg-orange-500/10">
            <Users className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="font-medium text-sm">Team Collaboration</p>
            <p className="text-xs text-muted-foreground">
              Review recorded ownership and recent changes
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <kbd className="px-2 py-1 text-xs border rounded bg-muted">⌘K</kbd>
        <span>Quick actions</span>
        <span className="text-muted-foreground/50">•</span>
        <kbd className="px-2 py-1 text-xs border rounded bg-muted">?</kbd>
        <span>Keyboard shortcuts</span>
      </div>
    </Card>
  );
}
