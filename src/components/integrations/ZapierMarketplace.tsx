import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, Grid3x3, List, X, RefreshCw, Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { ZapierAppCard } from "./ZapierAppCard";

interface ZapierApp {
  id: string;
  name: string;
  description: string;
  category: string[];
  status: string;
  premium: boolean;
  logo_url: string;
  connections_count: number;
  auth_type: string;
  supports_triggers: boolean;
  supports_actions: boolean;
  pricing_tier: string;
  is_connected?: boolean;
  connection_info?: Record<string, unknown>;
}

interface ZapierMarketplaceProps {
  embedded?: boolean;
}

export function ZapierMarketplace({ embedded = false }: ZapierMarketplaceProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [apps, setApps] = useState<ZapierApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedPricingTier, setSelectedPricingTier] = useState(searchParams.get("pricing") || "");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ total_apps: 0, connected_apps: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Sync Zapier apps on mount (only once)
  useEffect(() => {
    syncZapierApps();
  }, []);

  // Handle OAuth callback success
  useEffect(() => {
    const connectedAppId = searchParams.get("connected");
    if (connectedAppId) {
      toast({
        title: "Success",
        description: "App connected successfully",
      });
      // Remove the connected param from URL
      const params = new URLSearchParams(searchParams);
      params.delete("connected");
      setSearchParams(params, { replace: true });
      // Refresh apps list
      fetchApps();
    }
  }, [searchParams]);

  // Fetch apps when filters change
  useEffect(() => {
    fetchApps();
  }, [debouncedSearch, selectedCategory, selectedPricingTier, page]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedPricingTier) params.set("pricing", selectedPricingTier);
    setSearchParams(params);
  }, [debouncedSearch, selectedCategory, selectedPricingTier, setSearchParams]);

  const syncZapierApps = async (manual = false) => {
    setSyncing(true);
    try {
      const data = await invokeEdgeFunction('zapier-apps-sync');

      console.log(`Synced ${data.synced_count} Zapier apps`);
      
      if (manual) {
        toast({
          title: "Sync complete",
          description: `Successfully synced ${data.synced_count} Zapier apps`,
        });
        // Refresh the apps list
        await fetchApps();
      }
    } catch (error) {
      console.error('Error syncing Zapier apps:', error);
      toast({
        title: manual ? "Sync failed" : "Sync notice",
        description: manual ? "Failed to sync Zapier apps" : "Using cached Zapier apps",
        variant: manual ? "destructive" : "default",
      });
    } finally {
      setSyncing(false);
    }
  };

  const fetchApps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedPricingTier) params.set("pricing_tier", selectedPricingTier);
      params.set("page", page.toString());
      params.set("pageSize", "20");

      const data = await invokeEdgeFunction('zapier-apps-list');

      setApps(data.apps || []);
      setCategories(data.filters?.categories || []);
      setStats(data.stats || { total_apps: 0, connected_apps: 0 });
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching Zapier apps:', error);
      toast({
        title: "Error",
        description: "Failed to load Zapier apps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (appId: string) => {
    try {
      const data = await invokeEdgeFunction('zapier-app-connect', { app_id: appId });

      // Redirect to OAuth flow
      if (data.oauth_url) {
        window.location.href = data.oauth_url;
      } else {
        // Fallback for mock/direct connections
        toast({
          title: "Success",
          description: data.message || "App connected successfully",
        });
        fetchApps();
      }
    } catch (error) {
      console.error('Error connecting app:', error);
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Failed to connect app",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (appId: string) => {
    try {
      const data = await invokeEdgeFunction('zapier-app-disconnect', { app_id: appId });

      toast({
        title: "Success",
        description: "App disconnected successfully",
      });

      // Refresh apps list
      fetchApps();
    } catch (error) {
      console.error('Error disconnecting app:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect app",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedPricingTier("");
    setPage(1);
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedPricingTier;

  return (
    <div className="space-y-6">
      {/* Header with Stats and Sync Button */}
      {!embedded && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Zapier Apps</h2>
              <p className="text-sm text-muted-foreground">Connect your favorite apps to automate workflows</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncZapierApps(true)}
              disabled={syncing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Apps'}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Apps</div>
              <div className="text-2xl font-bold text-foreground">{stats.total_apps}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Connected</div>
              <div className="text-2xl font-bold text-primary">{stats.connected_apps}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Free Apps</div>
              <div className="text-2xl font-bold text-foreground">
                {apps.filter(a => a.pricing_tier === 'free').length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Premium Apps</div>
              <div className="text-2xl font-bold text-foreground">
                {apps.filter(a => a.pricing_tier === 'premium').length}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <Select value={selectedCategory || "all"} onValueChange={(val) => setSelectedCategory(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Pricing Filter */}
        <Select value={selectedPricingTier || "all"} onValueChange={(val) => setSelectedPricingTier(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Pricing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pricing</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchQuery && (
            <Badge variant="secondary">
              Search: {searchQuery}
              <X
                className="ml-2 h-3 w-3 cursor-pointer"
                onClick={() => setSearchQuery("")}
              />
            </Badge>
          )}
          {selectedCategory && (
            <Badge variant="secondary">
              Category: {selectedCategory}
              <X
                className="ml-2 h-3 w-3 cursor-pointer"
                onClick={() => setSelectedCategory("")}
              />
            </Badge>
          )}
          {selectedPricingTier && (
            <Badge variant="secondary">
              Pricing: {selectedPricingTier}
              <X
                className="ml-2 h-3 w-3 cursor-pointer"
                onClick={() => setSelectedPricingTier("")}
              />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Syncing Notice */}
      {syncing && (
        <Alert>
          <AlertDescription>
            Syncing latest apps from Zapier marketplace...
          </AlertDescription>
        </Alert>
      )}

      {/* Apps Grid/List */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "border border-border rounded-lg overflow-hidden bg-card"}>
          {[...Array(6)].map((_, i) => (
            viewMode === "list" ? (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-border">
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            ) : (
              <div key={i} className="p-6 border border-border rounded-lg bg-card">
                <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-10 w-full" />
              </div>
            )
          ))}
        </div>
      ) : apps.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No apps found"
          description="No apps found matching your filters"
          action={{
            label: "Clear filters",
            onClick: clearFilters,
          }}
        />
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "border border-border rounded-lg overflow-hidden bg-card"}>
          {apps.map((app) => (
            <ZapierAppCard
              key={app.id}
              app={app}
              viewMode={viewMode}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}