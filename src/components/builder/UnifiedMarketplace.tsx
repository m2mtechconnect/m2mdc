import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Eye, Sparkles, Shield, Server, CheckCircle2, Loader2, Plug } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const CATEGORIES = [
  "Productivity & Docs",
  "Social & Communication",
  "Entertainment",
  "Developer Tools",
  "Payments & Finance",
  "Search Tools",
  "Sales",
  "Databases",
  "Customer Support",
];

const TYPE_FILTERS = [
  { value: "arcade optimized", label: "Arcade Optimized", icon: Sparkles },
  { value: "arcade starter", label: "Arcade Starter", icon: Server },
  { value: "verified", label: "Verified", icon: Shield },
  { value: "community", label: "Community", icon: Plug },
  { value: "auth provider", label: "Auth Provider", icon: CheckCircle2 },
];

const FEATURE_FILTERS = [
  { value: "Featured", label: "🔥 Featured" },
  { value: "BYOC", label: "BYOC" },
  { value: "Pro", label: "PRO" },
];

interface ArcadeServer {
  id: string;
  name: string;
  designation: string;
  category: string;
  tags: string[];
  description: string;
  logo: string;
  capabilities: { tools: number; resources: number; prompts: number };
  auth_method: string;
  endpoint: string;
  featured?: boolean;
}

interface UnifiedMarketplaceProps {
  mode?: "full" | "embedded";
  source?: "arcade";
  systemId?: string;
  onSelectApp?: (app: ArcadeServer) => void;
  onRegisterApp?: (appId: string) => void;
}

export default function UnifiedMarketplace({ 
  mode = "full",
  source = "arcade",
  systemId,
  onSelectApp,
  onRegisterApp
}: UnifiedMarketplaceProps) {
  const { toast } = useToast();
  const [servers, setServers] = useState<ArcadeServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [previewServer, setPreviewServer] = useState<ArcadeServer | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = mode === "full" ? 24 : 12;

  useEffect(() => {
    console.log('[UnifiedMarketplace] Component mounted, loading servers...');
    loadServers();
  }, [searchQuery, selectedCategories, selectedTypes, selectedFeatures, page]);

  const loadServers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchQuery) params.set('q', searchQuery);
      if (selectedCategories.length > 0) params.set('category', selectedCategories?.[0] || '');
      if (selectedTypes.length > 0) params.set('type', selectedTypes?.[0] || '');
      if (selectedFeatures.length > 0) params.set('features', selectedFeatures.join(','));
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const queryString = params.toString();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/arcade-servers${queryString ? `?${queryString}` : ''}`;
      
      console.log('Loading servers from:', url);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Arcade servers error:', response.status, errorText);
        throw new Error(`Failed to load servers: ${response.status}`);
      }

      const data = await response.json();
      console.log('Loaded servers:', data.items?.length, 'total:', data.total);
      
      setServers(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error loading servers:', error);
      toast({
        title: "Error",
        description: "Failed to load marketplace servers. Check console for details.",
        variant: "destructive",
      });
      // Fallback to empty array
      setServers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (server: ArcadeServer) => {
    setPreviewServer(server);
    setIsPreviewOpen(true);
  };

  const handleRegister = async (server: ArcadeServer) => {
    if (!systemId) {
      toast({
        title: "System Required",
        description: "Please create a system first before registering servers",
        variant: "destructive",
      });
      return;
    }

    try {
      setRegistering(server.id);

      // Register the server
      const { data: registerData, error: registerError } = await supabase.functions.invoke(
        'arcade-servers',
        {
          method: 'POST',
          body: JSON.stringify({ system_id: systemId }),
          headers: {
            'Content-Type': 'application/json',
            'x-server-id': server.id
          }
        }
      );

      if (registerError) throw registerError;

      // Validate capabilities
      const { error: validateError } = await supabase.functions.invoke('mcp-validate', {
        body: {
          endpoint: server.endpoint,
          transport: 'http-stream'
        }
      });

      if (validateError) throw validateError;

      toast({
        title: "Server Registered",
        description: `${server.name} has been registered and validated successfully`,
      });

      if (onRegisterApp) {
        onRegisterApp(server.id);
      }

      setIsPreviewOpen(false);
    } catch (error) {
      console.error('Error registering server:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register server",
        variant: "destructive",
      });
    } finally {
      setRegistering(null);
    }
  };

  const handleUseInBuilder = (server: ArcadeServer) => {
    if (onSelectApp) {
      onSelectApp(server);
    }
    setIsPreviewOpen(false);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [category]
    );
    setPage(1);
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [type]
    );
    setPage(1);
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSelectedFeatures([]);
    setPage(1);
  };

  const getDesignationColor = (designation: string) => {
    if (designation.includes("Optimized")) return "bg-primary text-primary-foreground";
    if (designation.includes("Starter")) return "bg-secondary text-secondary-foreground";
    if (designation === "Verified") return "bg-accent text-accent-foreground";
    return "bg-muted text-muted-foreground";
  };

  const containerClass = mode === "full" ? "min-h-screen p-8" : "";

  return (
    <div className={containerClass}>
      {mode === "full" && (
        <div className="mb-6">
          <h1 className="text-h1 font-display mb-2">MCP Servers (Arcade)</h1>
          <p className="text-body text-muted-foreground">
            Browse optimized, starter, verified, and community servers
          </p>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside className="w-64 space-y-6 flex-shrink-0">
          <div>
            <h3 className="text-h4 font-display mb-3">Search</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search servers..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <h3 className="text-h4 font-display mb-3">Category</h3>
            <ScrollArea className="h-64">
              <div className="space-y-2">
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
            </ScrollArea>
          </div>

          <div>
            <h3 className="text-h4 font-display mb-3">Type</h3>
            <div className="space-y-2">
              {TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={value}
                    checked={selectedTypes.includes(value)}
                    onCheckedChange={() => toggleType(value)}
                  />
                  <Label htmlFor={value} className="cursor-pointer text-sm flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-h4 font-display mb-3">Features</h3>
            <div className="space-y-2">
              {FEATURE_FILTERS.map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={value}
                    checked={selectedFeatures.includes(value)}
                    onCheckedChange={() => toggleFeature(value)}
                  />
                  <Label htmlFor={value} className="cursor-pointer text-sm">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {(searchQuery || selectedCategories.length > 0 || selectedTypes.length > 0 || selectedFeatures.length > 0) && (
            <Button variant="outline" onClick={clearFilters} className="w-full">
              Clear Filters
            </Button>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total} server{total !== 1 ? 's' : ''} available
            </p>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: limit }).map((_, i) => (
                <Card key={i} className="section-padding">
                  <Skeleton className="h-48" />
                </Card>
              ))}
            </div>
          ) : servers.length === 0 ? (
            <EmptyState
              icon={Server}
              title="No servers found"
              description="Try adjusting your search or filters"
              action={{
                label: "Clear Filters",
                onClick: clearFilters,
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {servers.map((server) => (
                <Card
                  key={server.id}
                  className="section-padding hover:border-accent transition-all hover:shadow-lg group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={server.logo}
                          alt={server.name}
                          className="h-10 w-10 rounded object-contain"
                        />
                        <div>
                          <h3 className="text-h4 font-display">{server.name}</h3>
                          <Badge className={getDesignationColor(server.designation) + " text-xs"}>
                            {server.designation}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 flex-wrap">
                      {server.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-caption text-muted-foreground line-clamp-2">
                      {server.description}
                    </p>

                    <div className="flex items-center gap-4 text-caption text-muted-foreground">
                      <span>{server.capabilities.tools} tools</span>
                      <span>{server.capabilities.resources} resources</span>
                      <span>{server.capabilities.prompts} prompts</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(server)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => mode === "embedded" ? handleUseInBuilder(server) : handleRegister(server)}
                        disabled={registering === server.id}
                        className="flex-1"
                      >
                        {registering === server.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        {mode === "embedded" ? "Use" : "Register"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {previewServer && (
                <>
                  <img
                    src={previewServer.logo}
                    alt={previewServer.name}
                    className="h-8 w-8 rounded object-contain"
                  />
                  {previewServer.name}
                  <Badge className={getDesignationColor(previewServer.designation)}>
                    {previewServer.designation}
                  </Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {previewServer && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                <TabsTrigger value="auth">Auth</TabsTrigger>
                <TabsTrigger value="example">Example</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div>
                  <h4 className="text-h4 font-display mb-2">Description</h4>
                  <p className="text-body text-muted-foreground">{previewServer.description}</p>
                </div>
                <div>
                  <h4 className="text-h4 font-display mb-2">Category</h4>
                  <Badge variant="secondary">{previewServer.category}</Badge>
                </div>
                <div>
                  <h4 className="text-h4 font-display mb-2">Tags</h4>
                  <div className="flex gap-2 flex-wrap">
                    {previewServer.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="capabilities" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="section-padding text-center">
                    <p className="text-h2 font-display text-primary">{previewServer.capabilities.tools}</p>
                    <p className="text-caption text-muted-foreground">Tools</p>
                  </Card>
                  <Card className="section-padding text-center">
                    <p className="text-h2 font-display text-secondary">{previewServer.capabilities.resources}</p>
                    <p className="text-caption text-muted-foreground">Resources</p>
                  </Card>
                  <Card className="section-padding text-center">
                    <p className="text-h2 font-display text-accent">{previewServer.capabilities.prompts}</p>
                    <p className="text-caption text-muted-foreground">Prompts</p>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="auth" className="space-y-4">
                <div>
                  <h4 className="text-h4 font-display mb-2">Authentication Method</h4>
                  <Badge variant="secondary" className="text-sm">{previewServer.auth_method}</Badge>
                </div>
                <div>
                  <h4 className="text-h4 font-display mb-2">Endpoint</h4>
                  <code className="text-sm bg-muted p-2 rounded block">{previewServer.endpoint}</code>
                </div>
              </TabsContent>

              <TabsContent value="example" className="space-y-4">
                <div>
                  <h4 className="text-h4 font-display mb-2">Example Workflow</h4>
                  <p className="text-body text-muted-foreground">
                    Connect {previewServer.name} to your AI system to enable {previewServer.capabilities.tools} specialized tools
                    for {previewServer.category.toLowerCase()} automation.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            {previewServer && (
              <Button
                onClick={() => mode === "embedded" ? handleUseInBuilder(previewServer) : handleRegister(previewServer)}
                disabled={registering === previewServer.id}
              >
                {registering === previewServer.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {mode === "embedded" ? "Use in Builder" : "Register"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
