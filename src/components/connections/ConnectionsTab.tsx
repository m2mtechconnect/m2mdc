/**
 * Operational connection register. One row per configured connection with
 * runtime-derived status, last event, throughput and mapping coverage.
 * Below the lg breakpoint the table becomes accessible summary cards.
 */
import { useMemo, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/v2';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { formatRelative, type ConnectionRow } from '@/connections/presentation';

interface Props {
  rows: ConnectionRow[];
  loading: boolean;
  isAdmin: boolean;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onTest: (id: string) => void;
  onMap: (id: string) => void;
  onCredential: (id: string) => void;
}

export function ConnectionsTab({ rows, loading, isAdmin, onOpen, onAdd, onTest, onMap, onCredential }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery =
        !q ||
        r.connection.display_name.toLowerCase().includes(q) ||
        r.connection.connector_id.toLowerCase().includes(q) ||
        (r.definition?.name ?? '').toLowerCase().includes(q);
      const matchesStatus = status === 'all' || r.connection.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [rows, query, status]);

  const statuses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.connection.status))).sort(),
    [rows],
  );

  function Actions({ row }: { row: ConnectionRow }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`Actions for ${row.connection.display_name}`}>
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => onOpen(row.connection.id)}>Open details</DropdownMenuItem>
          <DropdownMenuItem disabled={!isAdmin} onSelect={() => onTest(row.connection.id)}>Test connection</DropdownMenuItem>
          <DropdownMenuItem disabled={!isAdmin} onSelect={() => onCredential(row.connection.id)}>Credential vault</DropdownMenuItem>
          <DropdownMenuItem disabled={!isAdmin} onSelect={() => onMap(row.connection.id)}>Map data</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search connections"
          aria-label="Search connections"
          className="h-10 w-full max-w-xs text-sm"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 w-[200px] text-sm" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} of {rows.length}</span>
      </div>

      {filtered.length === 0 ? (
        <Panel className="p-8">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold">
              {rows.length === 0 ? 'No connection is configured yet' : 'No connection matches this filter'}
            </p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {rows.length === 0
                ? 'Add a connection to bind a facility, gateway or platform source to this tenant. Configuration alone never reports a healthy status: a server-side check must pass and data must arrive.'
                : 'Clear the search or status filter to see all configured connections.'}
            </p>
            {rows.length === 0 && (
              <Button className="h-10" disabled={!isAdmin} onClick={onAdd}>Add connection</Button>
            )}
          </div>
        </Panel>
      ) : (
        <>
          {/* Desktop register */}
          <div className="v2-panel hidden min-w-0 overflow-x-auto p-0 lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase">Connection</TableHead>
                  <TableHead className="text-xs uppercase">Environment</TableHead>
                  <TableHead className="text-xs uppercase">Direction</TableHead>
                  <TableHead className="text-xs uppercase">Status</TableHead>
                  <TableHead className="text-xs uppercase">Last event</TableHead>
                  <TableHead className="text-xs uppercase">Throughput</TableHead>
                  <TableHead className="text-xs uppercase">Mapping</TableHead>
                  <TableHead className="text-xs uppercase">Owner</TableHead>
                  <TableHead className="text-right text-xs uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.connection.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${row.connection.display_name}`}
                    className="cursor-pointer"
                    onClick={() => onOpen(row.connection.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(row.connection.id); }
                    }}
                  >
                    <TableCell className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-xs font-semibold ${row.glyph.className}`} aria-hidden>
                          {row.glyph.mark}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.connection.display_name}</p>
                          <p className="v2-mono truncate text-xs text-muted-foreground">
                            {row.definition?.name ?? row.connection.connector_id} · {row.glyph.label}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{row.connection.environment}</TableCell>
                    <TableCell className="text-sm">{row.connection.data_direction}</TableCell>
                    <TableCell><ConnectionStatusBadge status={row.connection.status} /></TableCell>
                    <TableCell className="v2-mono text-sm">{formatRelative(row.connection.last_ingest_at)}</TableCell>
                    <TableCell className="v2-mono text-sm tabular-nums">{row.throughput.label}</TableCell>
                    <TableCell className="v2-mono text-sm tabular-nums">{row.coverage.label}</TableCell>
                    <TableCell className="text-sm">{row.connection.is_system ? 'Platform' : row.connection.owner_id ? 'Tenant' : 'Unassigned'}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Actions row={row} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Tablet and mobile summary cards */}
          <ul className="space-y-3 lg:hidden">
            {filtered.map((row) => (
              <li key={row.connection.id}>
                <Panel className="min-w-0">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-xs font-semibold ${row.glyph.className}`} aria-hidden>
                          {row.glyph.mark}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.connection.display_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.definition?.name ?? row.connection.connector_id} · {row.connection.environment}
                          </p>
                        </div>
                      </div>
                      <ConnectionStatusBadge status={row.connection.status} />
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div><dt className="v2-label">Last event</dt><dd className="v2-mono">{formatRelative(row.connection.last_ingest_at)}</dd></div>
                      <div><dt className="v2-label">Throughput</dt><dd className="v2-mono">{row.throughput.label}</dd></div>
                      <div><dt className="v2-label">Mapping</dt><dd className="v2-mono">{row.coverage.label}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Direction</dt><dd>{row.connection.data_direction}</dd></div>
                    </dl>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" className="h-10" onClick={() => onOpen(row.connection.id)}>
                        Open details
                      </Button>
                      <Actions row={row} />
                    </div>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
