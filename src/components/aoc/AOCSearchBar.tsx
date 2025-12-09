import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface AOCSearchBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: FilterOptions) => void;
  placeholder?: string;
}

export interface FilterOptions {
  status?: string[];
  timeRange?: string;
  severity?: string[];
}

export function AOCSearchBar({ onSearch, onFilterChange, placeholder = "Search..." }: AOCSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    status: [],
    timeRange: '24h',
    severity: [],
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleFilterToggle = (category: keyof FilterOptions, value: string) => {
    setFilters(prev => {
      const categoryValue = prev[category];
      if (Array.isArray(categoryValue)) {
        const newValue = categoryValue.includes(value)
          ? categoryValue.filter(v => v !== value)
          : [...categoryValue, value];
        const updated = { ...prev, [category]: newValue };
        onFilterChange(updated);
        return updated;
      }
      return prev;
    });
  };

  const clearFilters = () => {
    const cleared = { status: [], timeRange: '24h', severity: [] };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const activeFilterCount = (filters.status?.length || 0) + (filters.severity?.length || 0);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => handleSearch('')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Popover open={showFilters} onOpenChange={setShowFilters}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Filters</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-0 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold mb-2 block">Status</Label>
                <div className="space-y-2">
                  {['completed', 'running', 'error', 'pending'].map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={filters.status?.includes(status)}
                        onCheckedChange={() => handleFilterToggle('status', status)}
                      />
                      <Label
                        htmlFor={`status-${status}`}
                        className="text-sm font-normal cursor-pointer capitalize"
                      >
                        {status}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-2 block">Severity</Label>
                <div className="space-y-2">
                  {['error', 'warning', 'info'].map((severity) => (
                    <div key={severity} className="flex items-center space-x-2">
                      <Checkbox
                        id={`severity-${severity}`}
                        checked={filters.severity?.includes(severity)}
                        onCheckedChange={() => handleFilterToggle('severity', severity)}
                      />
                      <Label
                        htmlFor={`severity-${severity}`}
                        className="text-sm font-normal cursor-pointer capitalize"
                      >
                        {severity}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
