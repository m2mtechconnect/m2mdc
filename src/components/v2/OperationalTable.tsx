/**
 * AURA Visual System V2 — operational table / list styling primitives.
 * Layout-only wrappers around native table semantics.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export function OperationalTable({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="v2-panel overflow-hidden p-0">
      <div className="max-h-full overflow-auto">
        <table className={cn('v2-table', className)} {...props} />
      </div>
    </div>
  );
}

export function OperationalRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('v2-list-row', className)} {...props} />;
}

/** Numeric cell: tabular monospace, right aligned. */
export function NumericCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td data-numeric="" className={className} {...props} />;
}
