import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, CheckCircle2, XCircle, Shield, Sparkles, Users, Package, Server } from "lucide-react";
import { logger } from "@/lib/logger";
// Animation removed for simplicity

interface ArcadeServer {
  id: string;
  name: string;
  designation: string;
  category: string;
  tags: string[];
  description: string;
  logo: string;
  capabilities: {
    tools: number;
    resources: number;
    prompts: number;
  };
  auth_method: string;
  endpoint: string;
}

interface MCPMarketplaceProps {
  systemId: string | null;
  onServerRegistered?: () => void;
}

const CATEGORIES = [
  "Productivity & Docs",
  "Social & Communication",
  "Entertainment",
  "Developer Tools",
  "Payments & Finance",
  "Search Tools",
  "Sales",
  "Databases",
  "Customer Support"
];

const TYPE_FILTERS = [
  { value: "optimized", label: "Arcade Optimized", icon: Sparkles },
  { value: "starter", label: "Arcade Starter", icon: Package },
  { value: "verified", label: "Verified", icon: Shield },
  { value: "community", label: "Community", icon: Users },
];

export function MCPMarketplace({ systemId, onServerRegistered }: MCPMarketplaceProps) {
  const { toast } = useToast();
  const [servers, setServers] = useState<ArcadeServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedServer, setSelectedServer] = useState<ArcadeServer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [page, setPage] = useState(1);
  const [totalServers, setTotalServers] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setPage(1); // Reset page when filters change
    loadServers(1, false);
  }, [searchQuery, selectedCategories, selectedTypes]);

  const loadServers = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', '48');
      if (searchQuery) params.append('q', searchQuery);
      if (selectedCategories.length > 0) params.append('category', selectedCategories.join(','));
      if (selectedTypes.length > 0) params.append('type', selectedTypes.join(','));

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/arcade-servers?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load servers: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data?.items || [];
      const total = data?.total || 0;
      const totalPages = data?.totalPages || 1;

      logger.debug('Loaded marketplace servers', { component: 'MCPMarketplace', action: 'loadServers', metadata: { count: items.length, total } });

      setServers(append ? [...servers, ...items] : items);
      setTotalServers(total);
      setHasMore(pageNum < totalPages);
      setPage(pageNum);
    } catch (error: any) {
      logger.error('Load servers error', error, { component: 'MCPMarketplace', action: 'loadServers' });
      toast({
        title: "Failed to load servers",
        description: error.message || "Could not fetch marketplace servers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    loadServers(nextPage, true);
  };

  const handleServerClick = (server: ArcadeServer) => {
    setSelectedServer(server);
    setIsDetailsOpen(true);
  };

  const handleRegister = async () => {
    if (!systemId || !selectedServer) return;

    setRegistering(true);
    try {
      // Register via Arcade API
      const { data: registerData, error: registerError } = await supabase.functions.invoke(
        'arcade-servers',
        {
          body: { system_id: systemId },
          method: 'POST',
        }
      );

      if (registerError) throw registerError;

      // Now probe capabilities via mcp-register
      const { data: mcpData, error: mcpError } = await supabase.functions.invoke('mcp-register', {
        body: {
          system_id: systemId,
          name: selectedServer.name,
          endpoint: selectedServer.endpoint,
          transport: "http-stream",
        }
      });

      if (mcpError) throw mcpError;

      toast({
        title: "Server Registered",
        description: `${selectedServer.name} has been added to your system with ${mcpData.capabilities?.tools?.length || 0} tools`,
      });

      setIsDetailsOpen(false);
      onServerRegistered?.();
    } catch (error: any) {
      logger.error('Register server error', error, { component: 'MCPMarketplace', action: 'handleRegister' });
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register server",
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getDesignationColor = (designation: string) => {
    if (designation.includes("Optimized")) return "text-accent";
    if (designation.includes("Verified")) return "text-primary";
    if (designation.includes("Starter")) return "text-muted-foreground";
    return "text-muted-foreground";
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar Filters */}
      <aside className="w-64 space-y-6 flex-shrink-0">
        <div>
          <h3 className="text-h4 font-display mb-3">Search</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <h3 className="text-h4 font-display mb-3">Type</h3>
          <div className="space-y-2">
            {TYPE_FILTERS.map((type) => (
              <div key={type.value} className="flex items-center gap-2">
                <Checkbox
                  id={type.value}
                  checked={selectedTypes.includes(type.value)}
                  onCheckedChange={() => toggleType(type.value)}
                />
                <Label htmlFor={type.value} className="flex items-center gap-2 cursor-pointer">
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-h4 font-display mb-3">Category</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {CATEGORIES.map((category) => (
              <div key={category} className="flex items-center gap-2">
                <Checkbox
                  id={category}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                />
                <Label htmlFor={category} className="cursor-pointer text-sm">
                  {category}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h2 font-display">MCP Servers (Arcade)</h2>
            <p className="text-caption text-muted-foreground">
              Discover, connect, and manage MCP servers to extend your AI
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {totalServers} server{totalServers !== 1 ? 's' : ''} available
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : servers.length === 0 ? (
          <EmptyState
            icon={Server}
            title="No servers found"
            description="No servers found matching your filters"
            action={{
              label: "Clear Filters",
              onClick: () => {
                setSearchQuery("");
                setSelectedCategories([]);
                setSelectedTypes([]);
              },
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map((server) => (
              <div key={server.id}>
                <Card
                    className="section-padding hover:border-accent cursor-pointer transition-colors h-full"
                    onClick={() => handleServerClick(server)}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        {server.logo ? (
                          <img src={server.logo} alt={server.name} className="w-6 h-6" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{server.name}</h3>
                        <p className={`text-xs ${getDesignationColor(server.designation)}`}>
                          {server.designation}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {server.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {server.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {server.capabilities.tools} tools • {server.capabilities.resources} resources
                    </div>
                  </Card>
                </div>
              ))}
          </div>
        )}

        {/* Load More Button */}
        {!loading && hasMore && servers.length > 0 && (
          <div className="flex justify-center pt-6">
            <Button 
              onClick={loadMore}
              variant="outline"
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Load More Servers
                  <span className="text-xs text-muted-foreground">
                    ({servers.length} of {totalServers})
                  </span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                {selectedServer?.logo ? (
                  <img src={selectedServer.logo} alt={selectedServer.name} className="w-8 h-8" />
                ) : (
                  <Package className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <div>{selectedServer?.name}</div>
                <div className={`text-sm font-normal ${getDesignationColor(selectedServer?.designation || "")}`}>
                  {selectedServer?.designation}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              {selectedServer?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-medium mb-2">Category</h4>
              <Badge variant="secondary">{selectedServer?.category}</Badge>
            </div>

            <div>
              <h4 className="font-medium mb-2">Capabilities</h4>
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{selectedServer?.capabilities.tools}</div>
                  <div className="text-xs text-muted-foreground">Tools</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{selectedServer?.capabilities.resources}</div>
                  <div className="text-xs text-muted-foreground">Resources</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{selectedServer?.capabilities.prompts}</div>
                  <div className="text-xs text-muted-foreground">Prompts</div>
                </Card>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Authentication</h4>
              <p className="text-sm text-muted-foreground">{selectedServer?.auth_method}</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {selectedServer?.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            <Button onClick={handleRegister} disabled={!systemId || registering}>
              {registering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Registering...
                </>
              ) : (
                'Register Server'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
