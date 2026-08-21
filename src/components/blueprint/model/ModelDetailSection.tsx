/**
 * Stage 7K — purposeful collapsible group used by the Model workspace.
 *
 * Real button semantics with aria-expanded / aria-controls, Enter and Space
 * toggle natively, and a one-line summary stays visible while collapsed so the
 * operator knows what is inside without opening it. Toggling writes no
 * browser-history entry and never closes a sibling section.
 */
import { useId, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  /** Short status word shown in the header, e.g. "Conflict" or "Complete". */
  status: string;
  itemCount: number;
  /** One line describing the contents while collapsed. */
  summary: string;
  open: boolean;
  onToggle: (next: boolean) => void;
  children: ReactNode;
  testId?: string;
}

export function ModelDetailSection({
  title,
  status,
  itemCount,
  summary,
  open,
  onToggle,
  children,
  testId,
}: Props) {
  const contentId = useId();
  return (
    <section className="rounded-lg border border-border bg-card" data-testid={testId} data-model-accordion="true">
      <h2>
        <button
          type="button"
          onClick={() => onToggle(!open)}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex min-h-11 w-full items-start gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {open ? (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              <span className="text-[13px] text-muted-foreground">
                {status} · {itemCount} item{itemCount === 1 ? '' : 's'}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{summary}</span>
          </span>
        </button>
      </h2>
      <div id={contentId} hidden={!open} className="border-t border-border px-3 py-3">
        {children}
      </div>
    </section>
  );
}