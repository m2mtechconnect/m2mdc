import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Filter {
  id: string;
  label: string;
  value: string;
}

interface FilterChipsProps {
  filters: Filter[];
  onRemove: (filterId: string) => void;
  onClearAll: () => void;
}

export default function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Active filters:</span>
      {filters.map((filter) => (
        <Badge
          key={filter.id}
          variant="secondary"
          className="gap-2 cursor-pointer hover:bg-destructive/10 transition-smooth"
          onClick={() => onRemove(filter.id)}
        >
          {filter.label}: {filter.value}
          <X className="h-3 w-3" />
        </Badge>
      ))}
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-smooth underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
