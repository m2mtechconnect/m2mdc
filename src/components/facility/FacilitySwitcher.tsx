/**
 * Stage 7E - compact facility switcher.
 *
 * Rendered inside the facility page header, never in the global navigation,
 * and only when the user has access to more than one facility. The current
 * route is preserved when switching.
 */
import { useMemo, useState } from 'react';
import { Building2, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useActiveTwin } from '@/context/ActiveTwinContext';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { toast } from 'sonner';

export function FacilitySwitcher({ className }: { className?: string }) {
  const { twins, activeTwinId, setActiveTwin } = useActiveTwin();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return twins;
    return twins.filter((t) => `${t.name} ${t.city}`.toLowerCase().includes(q));
  }, [twins, query]);

  // Single-facility users get no switcher and no inactive dropdown.
  if (twins.length < 2) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={className ?? 'h-[38px] text-[13px] font-normal'}
          data-testid="facility-switcher"
          aria-label="Change facility"
        >
          <Building2 className="mr-2 h-4 w-4" strokeWidth={1.75} aria-hidden />
          Change facility
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search facilities"
            aria-label="Search facilities"
            className="pl-8"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto" role="listbox" aria-label="Facilities">
          {matches.length === 0 && (
            <li className="px-2 py-3 text-sm text-muted-foreground">No matching facility.</li>
          )}
          {matches.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="option"
                aria-selected={t.id === activeTwinId}
                className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-md px-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  useRecommendationStore.getState().clearRecommendation();
                  setActiveTwin(t.id);
                  setOpen(false);
                  toast.success(`Switched to: ${t.name}`);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{t.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.city} · {t.tier}
                  </span>
                </span>
                {t.id === activeTwinId && <Check className="h-4 w-4 shrink-0" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export default FacilitySwitcher;
