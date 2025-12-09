import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, Filter, Sparkles } from 'lucide-react';

// 20 Top Industries
export const INDUSTRIES = [
  'Healthcare', 'Finance & Banking', 'Manufacturing', 'Energy & Utilities',
  'Retail & E-commerce', 'Technology', 'Telecommunications', 'Transportation & Logistics',
  'Real Estate', 'Insurance', 'Pharmaceuticals', 'Automotive',
  'Agriculture', 'Media & Entertainment', 'Education', 'Government & Public Sector',
  'Hospitality', 'Construction', 'Legal Services', 'Professional Services'
];

// 12 Key Departments
export const DEPARTMENTS = [
  'Operations', 'Finance', 'HR & Workforce', 'IT & DevOps',
  'Sales & CRM', 'Marketing', 'Customer Support', 'Supply Chain',
  'Compliance & Risk', 'Legal', 'R&D', 'Executive'
];

// Twin/Agent Types
export const TYPES = [
  'operational', 'workforce', 'compliance', 'financial',
  'supply_chain', 'predictive', 'sales_agent', 'support_agent', 'risk_agent'
];

// Difficulty Levels
export const LEVELS = ['beginner', 'intermediate', 'advanced'];

export interface StandardFiltersState {
  searchQuery: string;
  industryFilter: string;
  departmentFilter: string;
  typeFilter: string;
  levelFilter: string;
  statusFilter?: string; // For system mode only
  showRecommended: boolean;
}

interface StandardFiltersProps {
  mode: 'template' | 'system';
  filters: StandardFiltersState;
  onFiltersChange: (filters: StandardFiltersState) => void;
  onClearFilters?: () => void;
  disabled?: boolean;
}

export function StandardFilters({
  mode,
  filters,
  onFiltersChange,
  onClearFilters,
  disabled = false,
}: StandardFiltersProps) {
  const activeFiltersCount = [
    filters.industryFilter !== 'all',
    filters.departmentFilter !== 'all',
    filters.typeFilter !== 'all',
    filters.levelFilter !== 'all',
    filters.statusFilter && filters.statusFilter !== 'all',
    filters.showRecommended
  ].filter(Boolean).length;

  const updateFilter = (key: keyof StandardFiltersState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                type="search"
                placeholder={mode === 'template' 
                  ? "Search by industry, department, use case, KPI, or keywords..."
                  : "Search agents by name, department, or description..."}
                value={filters.searchQuery}
                onChange={(e) => updateFilter('searchQuery', e.target.value)}
                className="pl-10 bg-background/80 backdrop-blur-sm border-border/50"
                disabled={disabled}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Search across {mode === 'template' ? 'industries, departments, workflows, KPIs' : 'agent names and metadata'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-4 flex-wrap">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter {mode === 'template' ? 'templates' : 'agents'} by various criteria</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Industry Filter */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Select 
                value={filters.industryFilter} 
                onValueChange={(v) => updateFilter('industryFilter', v)}
                disabled={disabled}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {INDUSTRIES.map(ind => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter {mode === 'template' ? 'blueprints' : 'agents'} by your primary industry</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Department Filter */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Select 
                value={filters.departmentFilter} 
                onValueChange={(v) => updateFilter('departmentFilter', v)}
                disabled={disabled}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter by the team owning this {mode === 'template' ? 'twin' : 'agent'} (Ops, Supply Chain, HR, etc.)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Type Filter */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Select 
                value={filters.typeFilter} 
                onValueChange={(v) => updateFilter('typeFilter', v)}
                disabled={disabled}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter by {mode === 'template' ? 'twin/agent' : 'system'} type</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Level Filter (template mode only) */}
        {mode === 'template' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Select 
                  value={filters.levelFilter} 
                  onValueChange={(v) => updateFilter('levelFilter', v)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {LEVELS.map(level => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TooltipTrigger>
              <TooltipContent>
                <p>Filter by implementation complexity</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Status Filter (system mode only) */}
        {mode === 'system' && (
          <Select 
            value={filters.statusFilter || 'all'} 
            onValueChange={(v) => updateFilter('statusFilter', v)}
            disabled={disabled}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Recommended Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant={filters.showRecommended ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => updateFilter('showRecommended', !filters.showRecommended)}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Recommended for You
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{mode === 'template' 
                ? 'Show certified templates recommended based on your industry' 
                : 'Show recommended agents for your workflow'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear Filters ({activeFiltersCount})
          </Button>
        )}
      </div>
    </div>
  );
}
