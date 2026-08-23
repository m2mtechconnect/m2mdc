import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OperationalTable, StateView } from '@/components/v2';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  title?: string;
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export default function DataTable<T extends Record<string, any>>({
  title,
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
}: DataTableProps<T>) {
  return (
    <section className="min-w-0 space-y-3">
      {title ? <h2 className="v2-section-title">{title}</h2> : null}

      {loading ? (
        <StateView
          kind="loading"
          title="Loading data"
          description="Retrieving the latest available records."
        />
      ) : data.length === 0 ? (
        <StateView kind="empty" title={emptyMessage} />
      ) : (
        <OperationalTable>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, idx) => (
              <TableRow
                key={idx}
                onClick={() => onRowClick?.(item)}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(item);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                className={onRowClick ? 'cursor-pointer' : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render ? col.render(item) : item[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </OperationalTable>
      )}
    </section>
  );
}
