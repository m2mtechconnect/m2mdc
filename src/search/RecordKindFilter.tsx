/**
 * Phase 4 - scopes a search to record families that actually exist in this
 * product. The previous control offered Google Drive, SharePoint, Zapier and a
 * date picker, none of which were connected to anything.
 */
import { Button } from '@/components/ui/button';
import { SEARCH_KINDS, labelForKind, type SearchRecordKind } from './platformSearchApi';

interface Props {
  selected: SearchRecordKind[];
  counts: Partial<Record<SearchRecordKind, number>>;
  onChange: (kinds: SearchRecordKind[]) => void;
}

export default function RecordKindFilter({ selected, counts, onChange }: Props) {
  const toggle = (kind: SearchRecordKind) => {
    onChange(selected.includes(kind) ? selected.filter((k) => k !== kind) : [...selected, kind]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by record type">
      {SEARCH_KINDS.map((kind) => {
        const active = selected.includes(kind);
        return (
          <Button
            key={kind}
            type="button"
            size="sm"
            variant={active ? 'default' : 'outline'}
            aria-pressed={active}
            onClick={() => toggle(kind)}
            className="min-h-[36px]"
          >
            {labelForKind(kind)}
            {counts[kind] !== undefined && (
              <span className="ml-2 text-xs opacity-80">{counts[kind]}</span>
            )}
          </Button>
        );
      })}
      {selected.length > 0 && (
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange([])} className="min-h-[36px]">
          Clear
        </Button>
      )}
    </div>
  );
}
