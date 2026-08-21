/**
 * Persistent investigation-context bar.
 *
 * Shows the scope every workspace is currently answering for. Each chip is
 * removable and the whole context can be cleared in one action, so an operator
 * is never trapped in a filter they cannot see.
 */
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';

export function ContextBar() {
  const { chips, clearContextField, clearContext, selectionUnavailable } = useWorkspace();

  return (
    <div
      data-testid="dsx-context-bar"
      aria-label="Investigation context"
      className="v2-mono flex flex-wrap items-center gap-2 border-b border-[hsl(var(--v2-line))] bg-[hsl(var(--v2-canvas))] px-3 py-1.5 sm:px-4"
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Context
      </span>

      {chips.length === 0 && (
        <span className="text-xs text-muted-foreground" data-testid="dsx-context-empty">
          Whole facility. Select an asset, hall or workload to narrow every workspace.
        </span>
      )}

      {chips.map((chip) => (
        <Badge
          key={chip.field}
          variant="outline"
          data-testid={`dsx-context-chip-${chip.field}`}
          className="gap-1 py-0.5 pl-2 pr-1 text-[11px] font-normal"
        >
          <span className="text-muted-foreground">{chip.label}:</span>
          <span className="max-w-[16rem] truncate font-medium">{chip.value}</span>
          {chip.removable && (
            <button
              type="button"
              aria-label={`Remove ${chip.label} ${chip.value} from context`}
              onClick={() => clearContextField(chip.field)}
              className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
        </Badge>
      ))}

      {selectionUnavailable && (
        <span className="text-[11px] text-muted-foreground" data-testid="dsx-context-unresolved">
          The selected asset id is not present in the connected facility record.
        </span>
      )}

      {chips.length > 0 && (
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-7 text-xs"
          data-testid="dsx-context-clear"
          onClick={clearContext}
        >
          Clear context
        </Button>
      )}
    </div>
  );
}
