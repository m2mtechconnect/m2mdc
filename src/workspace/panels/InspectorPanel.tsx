import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { FacilityAsset, FacilityDefinition } from '../facilityModel';
import { useWorkspaceStore } from '../workspaceStore';

interface Props {
  facility: FacilityDefinition;
  assets: FacilityAsset[];
}

export function InspectorPanel({ facility, assets }: Props) {
  const selectedAssetId = useWorkspaceStore((s) => s.selectedAssetId);
  const selectAsset = useWorkspaceStore((s) => s.selectAsset);
  const [query, setQuery] = useState('');

  const selected = assets.find((a) => a.id === selectedAssetId) ?? assets[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets.slice(0, 40);
    return assets.filter((a) => a.name.toLowerCase().includes(q) || a.subsystem.toLowerCase().includes(q)).slice(0, 40);
  }, [assets, query]);

  const dependents = assets.filter((a) => a.dependencies.includes(selected?.id ?? ''));

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <label htmlFor="asset-search" className="sr-only">
          Search facility assets
        </label>
        <Input
          id="asset-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search racks, rows, power, cooling"
          className="h-9"
        />
      </div>

      <div className="max-h-44 overflow-y-auto rounded-md border border-border">
        <ul role="listbox" aria-label="Facility assets">
          {filtered.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                role="option"
                aria-selected={asset.id === selected?.id}
                onClick={() => selectAsset(asset.id)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  asset.id === selected?.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                )}
              >
                <span className="truncate">{asset.name}</span>
                <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{asset.subsystem}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{selected.name}</h3>
            <p className="text-xs text-muted-foreground">
              {selected.subsystem} · modelled asset in {facility.name}
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-1.5">
            {selected.attributes.map((attr) => (
              <div key={attr.label} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5">
                <dt className="text-xs text-muted-foreground">{attr.label}</dt>
                <dd className="text-xs font-medium tabular-nums text-foreground">{attr.value}</dd>
              </div>
            ))}
          </dl>

          {selected.dependencies.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Depends on</p>
              <div className="flex flex-wrap gap-1">
                {selected.dependencies.map((dep) => (
                  <Button key={dep} size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => selectAsset(dep)}>
                    {assets.find((a) => a.id === dep)?.name ?? dep}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {dependents.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Impacts ({dependents.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {dependents.slice(0, 8).map((dep) => (
                  <Badge key={dep.id} variant="secondary" className="text-[10px]">
                    {dep.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}