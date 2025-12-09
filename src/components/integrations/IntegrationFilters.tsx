import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Folder, FolderOpen, Zap, Code, Plug, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  IntegrationFilters as Filters, 
  INTEGRATION_CATEGORIES, 
  INTEGRATION_TYPES,
  IntegrationType,
  IntegrationStatus 
} from "@/types/integrations";

interface IntegrationFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  statusCounts?: {
    total: number;
    connected: number;
    available: number;
    error: number;
    expired?: number;
  };
}

const STATUS_FILTERS: Array<{ value: IntegrationStatus | null; label: string }> = [
  { value: null, label: "All integrations" },
  { value: "connected", label: "Connected" },
  { value: "available", label: "Available" },
  { value: "error", label: "Needs attention" },
];

export function IntegrationFilters({
  filters,
  onFiltersChange,
  statusCounts = { total: 0, connected: 0, available: 0, error: 0 },
}: IntegrationFiltersProps) {
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.selectedCategories.includes(category)
      ? filters.selectedCategories.filter((c) => c !== category)
      : [...filters.selectedCategories, category];
    updateFilter("selectedCategories", newCategories);
  };

  const toggleType = (type: IntegrationType) => {
    const newTypes = filters.selectedTypes.includes(type)
      ? filters.selectedTypes.filter((t) => t !== type)
      : [...filters.selectedTypes, type];
    updateFilter("selectedTypes", newTypes);
  };

  const getTypeIcon = (type: IntegrationType) => {
    switch (type) {
      case "native": return <Link2 className="h-4 w-4" />;
      case "zapier": return <Zap className="h-4 w-4" />;
      case "mcp": return <Plug className="h-4 w-4" />;
      case "api": return <Code className="h-4 w-4" />;
    }
  };

  return (
    <aside className="w-64 flex-shrink-0 space-y-6">
      {/* Search */}
      <div>
        <h3 className="text-sm font-medium mb-3">Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter("searchQuery", e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Status Filters */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium mb-3">Status</h3>
        <div className="space-y-1">
          {STATUS_FILTERS.map((status) => {
            const count = 
              status.value === null ? statusCounts.total :
              status.value === "connected" ? statusCounts.connected :
              status.value === "available" ? statusCounts.available :
              status.value === "error" ? statusCounts.error : 0;

            // Hide error filter if no errors
            if (status.value === "error" && count === 0) return null;

            return (
              <button
                key={status.value || "all"}
                onClick={() => updateFilter("selectedStatus", status.value)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                  filters.selectedStatus === status.value
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <span>{status.label}</span>
                <Badge 
                  variant={status.value === "error" ? "destructive" : "secondary"}
                  className="ml-2"
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Type Filters */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium mb-3">Type</h3>
        <div className="space-y-2">
          {INTEGRATION_TYPES.map((type) => (
            <div key={type.value} className="flex items-center gap-2">
              <Checkbox
                id={`type-${type.value}`}
                checked={filters.selectedTypes.includes(type.value)}
                onCheckedChange={() => toggleType(type.value)}
              />
              <Label
                htmlFor={`type-${type.value}`}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                {getTypeIcon(type.value)}
                {type.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filters */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium mb-3">Categories</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          <button
            onClick={() => updateFilter("selectedCategories", [])}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              filters.selectedCategories.length === 0
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            {filters.selectedCategories.length === 0 ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <Folder className="h-4 w-4" />
            )}
            <span>All categories</span>
          </button>
          {INTEGRATION_CATEGORIES.map((category) => {
            const isSelected = filters.selectedCategories.includes(category);
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                  isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                )}
              >
                {isSelected ? (
                  <FolderOpen className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="truncate">{category}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommended Toggle */}
      <div className="pt-4 border-t">
        <div className="flex items-center gap-2">
          <Checkbox
            id="recommended"
            checked={filters.recommended || false}
            onCheckedChange={(checked) => updateFilter("recommended", !!checked)}
          />
          <Label htmlFor="recommended" className="cursor-pointer text-sm">
            Recommended for you
          </Label>
        </div>
      </div>
    </aside>
  );
}
