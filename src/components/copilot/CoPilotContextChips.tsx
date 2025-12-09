/**
 * Co-Pilot Context Chips
 * 
 * Displays current context as compact chips at the top of Co-Pilot panel.
 */

import { Badge } from '@/components/ui/badge';
import { formatContextChips } from '@/lib/copilot/contextBuilder';
import type { CoPilotContext } from '@/lib/copilot/contextBuilder';

interface CoPilotContextChipsProps {
  context: CoPilotContext;
}

export function CoPilotContextChips({ context }: CoPilotContextChipsProps) {
  const chips = formatContextChips(context);

  if (chips.length === 0) return null;

  return (
    <div className="px-4 py-2 border-b border-border bg-muted/20">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs font-normal">
            {chip.label}: {chip.value}
          </Badge>
        ))}
      </div>
    </div>
  );
}
