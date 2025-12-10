import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Search, Folder, FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import { ZapierIntegrationCard } from "@/components/integrations/ZapierIntegrationCard";
import { IntegrationActivityLog } from "@/components/integrations/IntegrationActivityLog";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface BuilderIntegrationsHubProps {
  systemId: string | null;
}

const FEATURED_APPS = [
  { id: 'slack', name: 'Slack', description: 'Team communication platform', category: 'Communication', logo_url: '' },
  { id: 'gmail', name: 'Gmail', description: 'Email service', category: 'Email', logo_url: '' },
  { id: 'hubspot', name: 'HubSpot', description: 'CRM platform', category: 'CRM', logo_url: '' },
  { id: 'salesforce', name: 'Salesforce', description: 'Sales CRM', category: 'CRM', logo_url: '' },
  { id: 'jira', name: 'Jira', description: 'Project tracking', category: 'Project Management', logo_url: '' },
  { id: 'zendesk', name: 'Zendesk', description: 'Customer support', category: 'Support', logo_url: '' },
];

export function BuilderIntegrationsHub({ systemId }: BuilderIntegrationsHubProps) {
  // Enable automatic token refresh in background
  useTokenRefresh();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['zapier-status', systemId],
    queryFn: async () => {
      if (!systemId) return null;
      
      return await invokeEdgeFunction('zapier-integration-status', { systemId });
    },
    enabled: !!systemId,
  });

  const appsWithStatus = FEATURED_APPS.map(app => {
    const connection = statusData?.connections?.find((c: any) => 
      c.display_name?.toLowerCase() === app.name.toLowerCase()
    );
    
    let status: 'connected' | 'available' | 'error' = 'available';
    if (connection?.status === 'connected') {
      status = 'connected';
    } else if (connection?.status === 'error' || connection?.status === 'expired') {
      status = 'error';
    }
    
    return {
      ...app,
      status,
      connectionId: connection?.id,
    };
  });

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(FEATURED_APPS.map(app => app.category)));
    return cats.map(cat => ({
      name: cat,
      count: FEATURED_APPS.filter(app => app.category === cat).length,
    }));
  }, []);

  // Get status counts
  const statusCounts = useMemo(() => {
    const connected = appsWithStatus.filter(app => app.status === 'connected').length;
    const error = appsWithStatus.filter(app => app.status === 'error').length;
    const available = appsWithStatus.filter(app => app.status === 'available').length;
    return { connected, error, available };
  }, [appsWithStatus]);

  // Filter apps based on search, category, and status
  const filteredApps = useMemo(() => {
    return appsWithStatus.filter(app => {
      const matchesSearch = !searchQuery || 
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !selectedCategory || app.category === selectedCategory;
      const matchesStatus = !selectedStatus || app.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [appsWithStatus, searchQuery, selectedCategory, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h3 className="text-h3 font-display mb-2">Connect Business Systems</h3>
        <p className="text-body text-muted-foreground">
          Connect your business applications to enable AI-powered automation and data access
        </p>
      </div>

      {/* Info Banner */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          Connect your business systems to enable your AI to interact with external tools. 
          Configure triggers to invoke your agent and actions for your agent to take.
        </AlertDescription>
      </Alert>

      {/* Main Content Area with Sidebar */}
      <div className="flex gap-6">
        {/* Left Sidebar - Categories & Filters */}
        <div className="w-64 flex-shrink-0 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filters */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground px-2">Status</h4>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedStatus(null)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                  !selectedStatus 
                    ? "bg-accent text-accent-foreground" 
                    : "hover:bg-accent/50"
                )}
              >
                <span>All integrations</span>
                <Badge variant="secondary" className="ml-2">{appsWithStatus.length}</Badge>
              </button>
              <button
                onClick={() => setSelectedStatus('connected')}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                  selectedStatus === 'connected'
                    ? "bg-accent text-accent-foreground" 
                    : "hover:bg-accent/50"
                )}
              >
                <span>Connected</span>
                <Badge variant="secondary" className="ml-2">{statusCounts.connected}</Badge>
              </button>
              <button
                onClick={() => setSelectedStatus('available')}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                  selectedStatus === 'available'
                    ? "bg-accent text-accent-foreground" 
                    : "hover:bg-accent/50"
                )}
              >
                <span>Available</span>
                <Badge variant="secondary" className="ml-2">{statusCounts.available}</Badge>
              </button>
              {statusCounts.error > 0 && (
                <button
                  onClick={() => setSelectedStatus('error')}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                    selectedStatus === 'error'
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-accent/50"
                  )}
                >
                  <span>Needs attention</span>
                  <Badge variant="destructive" className="ml-2">{statusCounts.error}</Badge>
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground px-2">Categories</h4>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  !selectedCategory 
                    ? "bg-accent text-accent-foreground" 
                    : "hover:bg-accent/50"
                )}
              >
                {!selectedCategory ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                <span>All categories</span>
              </button>
              {categories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                    selectedCategory === cat.name
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {selectedCategory === cat.name ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                    <span>{cat.name}</span>
                  </div>
                  <Badge variant="secondary" className="ml-2">{cat.count}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 space-y-6">
          {/* Active Filters Display */}
          {(selectedCategory || selectedStatus || searchQuery) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filters:</span>
              {selectedCategory && (
                <Badge variant="secondary" className="gap-1">
                  {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedStatus && (
                <Badge variant="secondary" className="gap-1">
                  {selectedStatus}
                  <button
                    onClick={() => setSelectedStatus(null)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedStatus(null);
                  setSearchQuery("");
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Integration Status Summary */}
          {statusData?.summary && statusData.summary.connected > 0 && (
            <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-2xl font-bold text-primary">{statusData.summary.connected}</div>
                <div className="text-sm text-muted-foreground">Connected</div>
              </div>
              {statusData.summary.expired > 0 && (
                <div>
                  <div className="text-2xl font-bold text-warning">{statusData.summary.expired}</div>
                  <div className="text-sm text-muted-foreground">Expired</div>
                </div>
              )}
              {statusData.summary.errors > 0 && (
                <div>
                  <div className="text-2xl font-bold text-destructive">{statusData.summary.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              )}
            </div>
          )}

          {/* App Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No integrations found matching your filters.</p>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedStatus(null);
                  setSearchQuery("");
                }}
                className="mt-2 text-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredApps.map(app => (
                <ZapierIntegrationCard
                  key={app.id}
                  app={app}
                  systemId={systemId || ''}
                  connectionId={app.connectionId}
                  onStatusChange={refetch}
                />
              ))}
            </div>
          )}

          {/* Recent Activity */}
          {systemId && statusData?.summary.connected > 0 && filteredApps.length > 0 && (
            <div className="mt-6">
              <IntegrationActivityLog systemId={systemId} limit={5} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
