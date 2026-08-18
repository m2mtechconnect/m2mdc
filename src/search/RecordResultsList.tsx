/**
 * Phase 4 - renders authorized backend records. Each row links to the record's
 * own page inside the application and states the table and primary key it came
 * from, so a result can be traced back to the row that produced it.
 */
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Bot, Plug, Activity, ArrowRight } from 'lucide-react';
import type { PlatformSearchResult, SearchRecordKind } from './platformSearchApi';
import { labelForKind } from './platformSearchApi';

const KIND_ICON: Record<SearchRecordKind, typeof Building2> = {
  facility: Building2,
  agent: Bot,
  connection: Plug,
  run: Activity,
};

function highlight(text: string, term: string) {
  if (!text || !term) return text || '';
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={index} className="bg-primary/20 text-foreground font-medium">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'no timestamp';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 'no timestamp';
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

interface Props {
  results: PlatformSearchResult[];
  query: string;
}

export default function RecordResultsList({ results, query }: Props) {
  return (
    <ul className="space-y-3 list-none p-0 m-0">
      {results.map((result) => {
        const Icon = KIND_ICON[result.kind];
        return (
          <li key={result.id}>
            <Card className="p-5 transition-smooth hover:border-primary/50 focus-within:border-primary/50">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-primary shrink-0" aria-hidden />
                  <Badge variant="outline" className="text-xs">
                    {labelForKind(result.kind)}
                  </Badge>
                  {result.subtitle && (
                    <span className="text-xs text-muted-foreground truncate">{result.subtitle}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {relativeTime(result.updatedAt)}
                </span>
              </div>

              <h3 className="text-base font-semibold mb-1">
                <Link
                  to={result.route}
                  className="hover:text-primary transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {highlight(result.title, query)}
                </Link>
              </h3>

              {result.snippet && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {highlight(result.snippet, query)}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Provenance: the exact row behind this result. */}
                <code className="text-xs text-muted-foreground break-all">
                  {result.recordTable} · {result.recordId}
                </code>
                <Link
                  to={result.route}
                  className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  Open record
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
