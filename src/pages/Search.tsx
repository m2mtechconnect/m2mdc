/**
 * Phase 4 - `/search` over authorized backend records.
 *
 * This page previously rendered three hardcoded documents attributed to Google
 * Drive, SharePoint and Zendesk, with a `Math.random()` latency tile, while the
 * capability registry declared its data source as "Authorized AURA records".
 * It now queries the record families the product actually owns; row-level
 * security decides what comes back, and every tile reports a measured value.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search as SearchIcon, Clock, FileSearch, Database, AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { DCCard, DCSectionHeader } from '@/components/dc-ui/DCCard';
import { DCKPITile } from '@/components/dc-ui/DCKPITile';
import RecordResultsList from '@/search/RecordResultsList';
import RecordKindFilter from '@/search/RecordKindFilter';
import {
  searchPlatformRecords,
  sanitizeSearchTerm,
  labelForKind,
  type SearchRecordKind,
} from '@/search/platformSearchApi';

const DEBOUNCE_MS = 350;

export default function Search() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  // `?q=` is the authoritative query so a search result page is deep-linkable
  // and survives a refresh.
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [kinds, setKinds] = useState<SearchRecordKind[]>([]);
  const [debounced, setDebounced] = useState(() => sanitizeSearchTerm(query));

  // Keep the address bar in step with the query without stacking history entries.
  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (current === query) return;
    const next = new URLSearchParams(searchParams);
    if (query) next.set('q', query);
    else next.delete('q');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Adopt back/forward navigation and externally supplied deep links.
  useEffect(() => {
    const incoming = searchParams.get('q') ?? '';
    if (incoming !== query) setQuery(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // One request per settled query rather than one per keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(sanitizeSearchTerm(query)), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query]);

  const search = useQuery({
    queryKey: ['platform-search', debounced, [...kinds].sort().join(',')],
    queryFn: () => searchPlatformRecords(debounced, { kinds: kinds.length ? kinds : undefined }),
    enabled: debounced.length > 0,
    staleTime: 30_000,
  });

  const results = search.data?.results ?? [];
  const counts = useMemo(() => {
    // Every queried kind gets a count, so a searched-but-empty kind reads "0"
    // instead of silently rendering no number at all.
    const tally: Partial<Record<SearchRecordKind, number>> = {};
    for (const kind of search.data?.kindsQueried ?? []) tally[kind] = 0;
    for (const result of results) tally[result.kind] = (tally[result.kind] ?? 0) + 1;
    return tally;
  }, [results, search.data?.kindsQueried]);

  const submitted = debounced.length > 0;
  const failures = search.data?.failures ?? [];

  return (
    <div className="min-h-screen bg-background section-padding-lg">
      <div className="max-w-7xl mx-auto">
        <DCSectionHeader
          as="h1"
          title={t('search.title')}
          subtitle={t('search.subtitle')}
          icon={<FileSearch className="h-5 w-5" />}
        />

        {/* Measured query facts. Nothing here is synthesised. */}
        {submitted && search.data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <DCKPITile
              label={t('search.latency')}
              value={search.data.latencyMs.toString()}
              unit="ms"
              status="normal"
              icon={<Clock className="h-4 w-4" />}
              compact
            />
            <DCKPITile
              label={t('search.resultsFound')}
              value={results.length.toString()}
              status="normal"
              icon={<SearchIcon className="h-4 w-4" />}
              compact
            />
            <DCKPITile
              label={t('search.recordTypesSearched')}
              value={search.data.kindsQueried.length.toString()}
              status="normal"
              icon={<Database className="h-4 w-4" />}
              compact
            />
          </div>
        )}

        {/* Search bar. Submit is not required - results follow the query. */}
        <form onSubmit={(e) => e.preventDefault()} className="mb-6" role="search">
          <DCCard noPadding>
            <div className="p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <SearchIcon
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value.slice(0, 120))}
                    placeholder={t('search.searchPlaceholder')}
                    aria-label={t('search.searchPlaceholder')}
                    className="pl-12 h-12 text-body bg-card border-border"
                    maxLength={120}
                  />
                </div>
                <Button type="submit" className="glow-yellow h-12 min-w-[120px]">
                  {t('search.searchButton')}
                </Button>
              </div>
            </div>
          </DCCard>
        </form>

        <div className="mb-6">
          <RecordKindFilter selected={kinds} counts={counts} onChange={setKinds} />
        </div>

        {failures.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <AlertTitle>{t('search.partialResults')}</AlertTitle>
            <AlertDescription>
              {failures.map((failure) => `${labelForKind(failure.kind)}: ${failure.message}`).join(' | ')}
            </AlertDescription>
          </Alert>
        )}

        <div aria-live="polite">
          {!submitted ? (
            <EmptyState
              icon={SearchIcon}
              title={t('search.startSearching')}
              description={t('search.startSearchingDesc')}
            />
          ) : search.isPending ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t('search.searching')}</p>
          ) : search.isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <AlertTitle>{t('search.failedTitle')}</AlertTitle>
              <AlertDescription>
                {search.error instanceof Error ? search.error.message : String(search.error)}
              </AlertDescription>
            </Alert>
          ) : results.length > 0 ? (
            <RecordResultsList results={results} query={debounced} />
          ) : (
            <EmptyState icon={SearchIcon} title={t('search.noResults')} description={t('search.noResultsDesc')} />
          )}
        </div>
      </div>
    </div>
  );
}
