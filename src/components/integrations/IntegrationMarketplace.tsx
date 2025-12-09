import { useState, useMemo } from "react";
import { IntegrationCard } from "./IntegrationCard";
import { IntegrationFilters } from "./IntegrationFilters";
import { Integration, IntegrationFilters as Filters } from "@/types/integrations";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Plug } from "lucide-react";

interface IntegrationMarketplaceProps {
  integrations: Integration[];
  loading?: boolean;
  onConnect?: (integration: Integration) => void;
  onDisconnect?: (integration: Integration) => void;
  onConfigure?: (integration: Integration) => void;
  onViewDetails?: (integration: Integration) => void;
}

export function IntegrationMarketplace({
  integrations,
  loading = false,
  onConnect,
  onDisconnect,
  onConfigure,
  onViewDetails,
}: IntegrationMarketplaceProps) {
  const [filters, setFilters] = useState<Filters>({
    searchQuery: "",
    selectedCategories: [],
    selectedTypes: [],
    selectedStatus: null,
    recommended: false,
  });

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    return integrations.filter((integration) => {
      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = integration.name.toLowerCase().includes(query);
        const matchesDescription = integration.description?.toLowerCase().includes(query);
        const matchesCategory = integration.category.toLowerCase().includes(query);
        const matchesTags = integration.tags?.some(tag => tag.toLowerCase().includes(query));
        
        if (!matchesName && !matchesDescription && !matchesCategory && !matchesTags) {
          return false;
        }
      }

      // Category filter
      if (filters.selectedCategories.length > 0) {
        if (!filters.selectedCategories.includes(integration.category)) {
          return false;
        }
      }

      // Type filter
      if (filters.selectedTypes.length > 0) {
        if (!filters.selectedTypes.includes(integration.type)) {
          return false;
        }
      }

      // Status filter
      if (filters.selectedStatus) {
        if (integration.status !== filters.selectedStatus) {
          return false;
        }
      }

      return true;
    });
  }, [integrations, filters]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      total: integrations.length,
      connected: integrations.filter(i => i.status === "connected").length,
      available: integrations.filter(i => i.status === "available").length,
      error: integrations.filter(i => i.status === "error" || i.status === "expired").length,
    };
  }, [integrations]);

  const hasActiveFilters = 
    filters.searchQuery || 
    filters.selectedCategories.length > 0 || 
    filters.selectedTypes.length > 0 || 
    filters.selectedStatus ||
    filters.recommended;

  return (
    <div className="flex gap-6 h-full">
      {/* Filters Sidebar */}
      <IntegrationFilters
        filters={filters}
        onFiltersChange={setFilters}
        statusCounts={statusCounts}
      />

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h2 font-display">Integrations Hub</h2>
            <p className="text-caption text-muted-foreground mt-1">
              Connect your business systems and extend your agent's capabilities
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredIntegrations.length} of {integrations.length} integration{integrations.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filters:</span>
            {filters.searchQuery && (
              <Badge variant="secondary" className="gap-1">
                "{filters.searchQuery}"
                <button
                  onClick={() => setFilters({ ...filters, searchQuery: "" })}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.selectedCategories.map((cat) => (
              <Badge key={cat} variant="secondary" className="gap-1">
                {cat}
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      selectedCategories: filters.selectedCategories.filter((c) => c !== cat),
                    })
                  }
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            ))}
            {filters.selectedTypes.map((type) => (
              <Badge key={type} variant="secondary" className="gap-1 capitalize">
                {type}
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      selectedTypes: filters.selectedTypes.filter((t) => t !== type),
                    })
                  }
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            ))}
            {filters.selectedStatus && (
              <Badge variant="secondary" className="gap-1 capitalize">
                {filters.selectedStatus}
                <button
                  onClick={() => setFilters({ ...filters, selectedStatus: null })}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            <button
              onClick={() =>
                setFilters({
                  searchQuery: "",
                  selectedCategories: [],
                  selectedTypes: [],
                  selectedStatus: null,
                  recommended: false,
                })
              }
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Integration Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : filteredIntegrations.length === 0 ? (
          <EmptyState
            icon={Plug}
            title="No integrations found"
            description={
              hasActiveFilters
                ? "No integrations match your current filters"
                : "No integrations available"
            }
            action={
              hasActiveFilters
                ? {
                    label: "Clear Filters",
                    onClick: () =>
                      setFilters({
                        searchQuery: "",
                        selectedCategories: [],
                        selectedTypes: [],
                        selectedStatus: null,
                        recommended: false,
                      }),
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConnect={() => onConnect?.(integration)}
                onDisconnect={() => onDisconnect?.(integration)}
                onConfigure={() => onConfigure?.(integration)}
                onViewDetails={() => onViewDetails?.(integration)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
