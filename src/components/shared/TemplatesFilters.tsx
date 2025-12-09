import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { INDUSTRY_OPTIONS } from '@/config/filters';

interface TemplatesFiltersProps {
  searchQuery: string;
  selectedIndustries: string[];
  certified: boolean;
  onSearchChange: (query: string) => void;
  onIndustryToggle: (industry: string) => void;
  onCertifiedChange: (certified: boolean) => void;
  onClearFilters: () => void;
}

export function TemplatesFilters({
  searchQuery,
  selectedIndustries,
  certified,
  onSearchChange,
  onIndustryToggle,
  onCertifiedChange,
  onClearFilters,
}: TemplatesFiltersProps) {
  const hasActiveFilters = searchQuery || selectedIndustries.length > 0 || certified;

  return (
    <aside className="w-64 space-y-6 flex-shrink-0">
      {/* Search */}
      <div>
        <h3 className="text-h4 font-display mb-3">Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            role="search"
          />
        </div>
      </div>

      {/* Industry Filter */}
      <div>
        <h3 className="text-h4 font-display mb-3">Industry</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {INDUSTRY_OPTIONS.map((industry) => (
            <div key={industry} className="flex items-center gap-2">
              <Checkbox
                id={`industry-${industry}`}
                checked={selectedIndustries.includes(industry)}
                onCheckedChange={() => onIndustryToggle(industry)}
              />
              <Label 
                htmlFor={`industry-${industry}`} 
                className="cursor-pointer text-sm font-normal"
              >
                {industry}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Certified Filter */}
      <div>
        <h3 className="text-h4 font-display mb-3">Certification</h3>
        <div className="flex items-center gap-2">
          <Checkbox
            id="certified"
            checked={certified}
            onCheckedChange={(checked) => onCertifiedChange(checked === true)}
          />
          <Label htmlFor="certified" className="cursor-pointer text-sm font-normal">
            M2M Certified Only
          </Label>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </aside>
  );
}
