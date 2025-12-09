import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, X, LayoutGrid, Table } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

export interface FilterState {
  search: string;
  department: string;
  type: string[];
  status: string[];
  roiMin: number;
  roiMax: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface UnifiedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  viewMode: 'card' | 'table';
  onViewModeChange: (mode: 'card' | 'table') => void;
}

export function UnifiedFilters({ filters, onFiltersChange, viewMode, onViewModeChange }: UnifiedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const departments = ['All', 'Legal', 'Operations', 'Finance', 'Marketing', 'Human Resources', 'Engineering'];
  const sortOptions = [
    { value: 'updated_at', label: 'Last Activity' },
    { value: 'name', label: 'Alphabetical' },
    { value: 'roi', label: 'ROI' },
    { value: 'created_at', label: 'Created Date' },
  ];

  const activeFiltersCount = [
    filters.department !== 'All' ? 1 : 0,
    filters.status.length,
    filters.type.length,
    filters.roiMin > 0 || filters.roiMax < 500 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      department: 'All',
      type: [],
      status: [],
      roiMin: 0,
      roiMax: 500,
    });
  };

  const removeFilter = (key: keyof FilterState, value?: string) => {
    if (key === 'department') {
      onFiltersChange({ ...filters, department: 'All' });
    } else if (key === 'status' && value) {
      onFiltersChange({ ...filters, status: filters.status.filter(s => s !== value) });
    } else if (key === 'type' && value) {
      onFiltersChange({ ...filters, type: filters.type.filter(t => t !== value) });
    } else if (key === 'roiMin' || key === 'roiMax') {
      onFiltersChange({ ...filters, roiMin: 0, roiMax: 500 });
    }
  };

  return (
    <div className="space-y-3">
      {/* Search and Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search twins and agents..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filters.department} onValueChange={(v) => onFiltersChange({ ...filters, department: v })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('card')}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('table')}
              className="rounded-l-none border-l"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/50">
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={filters.sortBy} onValueChange={(v) => onFiltersChange({ ...filters, sortBy: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">ROI Range</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.roiMin}
                  onChange={(e) => onFiltersChange({ ...filters, roiMin: Number(e.target.value) })}
                  className="w-20"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.roiMax}
                  onChange={(e) => onFiltersChange({ ...filters, roiMax: Number(e.target.value) })}
                  className="w-20"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear All
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.department !== 'All' && (
            <Badge variant="secondary" className="gap-1">
              Department: {filters.department}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('department')} />
            </Badge>
          )}
          {filters.status.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1">
              Status: {s}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('status', s)} />
            </Badge>
          ))}
          {(filters.roiMin > 0 || filters.roiMax < 500) && (
            <Badge variant="secondary" className="gap-1">
              ROI: {filters.roiMin}% - {filters.roiMax}%
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('roiMin')} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
