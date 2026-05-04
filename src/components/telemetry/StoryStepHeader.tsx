/**
 * StoryStepHeader
 *
 * Numbered band that titles each section of the Overview decision-flow story.
 * Follows Lucas's recommended flow:
 *   1. Are we running efficiently?
 *   2. What is driving demand?
 *   3. Is demand creating risk?
 *   4. Where should we act first?
 *   5. Can we trust the data?
 *   6. Are we compliant and sustainable?
 */

import { ArrowUpRight } from 'lucide-react';

interface StoryStepHeaderProps {
  step: number;
  question: string;
  description?: string;
  drillTabLabel?: string;
  onDrill?: () => void;
}

export function StoryStepHeader({
  step,
  question,
  description,
  drillTabLabel,
  onDrill,
}: StoryStepHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent-foreground flex items-center justify-center text-sm font-semibold">
          {step}
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground leading-tight">
            {question}
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {drillTabLabel && onDrill && (
        <button
          type="button"
          onClick={onDrill}
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {drillTabLabel}
          <ArrowUpRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}