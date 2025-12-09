import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogStore } from '@/stores/catalogStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { McpServerPreviewModal } from '@/components/marketplace/McpServerPreviewModal';
import { Eye, Sparkles, Package, Users, Shield, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const MCP_CATEGORIES = ['email', 'productivity', 'data', 'analytics', 'communication', 'devops', 'crm', 'automation'];

const TYPE_FILTERS = [
  { value: "verified", label: "Verified", icon: Shield },
  { value: "optimized", label: "Optimized", icon: Sparkles },
];

interface McpGridProps {
  mode: 'marketplace' | 'builder';
  systemId?: string;
  onSelect?: (server: any) => void;
  searchQuery?: string;
}

export function McpGrid({ mode, systemId, onSelect, searchQuery: externalSearch = '' }: McpGridProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mcpServers, loadMcpServers, isLoadingMcp } = useCatalogStore();
  const [selectedServer, setSelectedServer] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    loadMcpServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearchQuery(externalSearch);
  }, [externalSearch]);

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

  const filteredServers = mcpServers.filter((server) => {
    const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategories.length > 0 && !selectedCategories.includes(server.category)) {
      return false;
    }
    
    if (selectedTypes.length > 0) {
      if (selectedTypes.includes('verified') && !server.verified) return false;
      if (selectedTypes.includes('optimized') && !server.optimized) return false;
    }

    return matchesSearch;
  });

  const handleUse = async (serverId: string) => {
    const server = mcpServers?.find(s => s.id === serverId);
    
    if (mode === 'builder' && onSelect && server) {
      onSelect(server);
      toast({ title: 'MCP Server added', description: 'Added to your system' });
      return;
    }

    if (mode === 'marketplace') {
      navigate(`/builder?step=3&mcpId=${serverId}`);
      toast({ title: 'MCP Server selected', description: 'Navigate to builder to configure' });
    }
  };

  if (isLoadingMcp) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  const getDesignationColor = (verified: boolean, optimized: boolean) => {
    if (optimized) return "text-accent";
    if (verified) return "text-primary";
    return "text-muted-foreground";
  };

  const getDesignationIcon = (verified: boolean, optimized: boolean) => {
    if (optimized) return Sparkles;
    if (verified) return Shield;
    return Package;
  };

  const getDesignation = (verified: boolean, optimized: boolean) => {
    if (optimized) return "M2M Optimized";
    if (verified) return "Verified";
    return "Community";
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar Filters - Matches Builder Layout */}
      {mode === 'marketplace' && (
        <aside className="w-64 space-y-6 flex-shrink-0">
          <div>
            <h3 className="text-h4 font-display mb-3">Search</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search MCP servers..."
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
              {MCP_CATEGORIES.map((category) => (
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
      )}

      {/* Main Content */}
      <div className="flex-1 space-y-6">

        {/* Servers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServers.map((server) => {
          const Icon = getDesignationIcon(server.verified, server.optimized);
          const designation = getDesignation(server.verified, server.optimized);
          return (
            <Card key={server.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    {server.logo_url ? (
                      <img src={server.logo_url} alt={server.name} className="w-6 h-6" />
                    ) : (
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{server.name}</CardTitle>
                    <p className={`text-xs ${getDesignationColor(server.verified, server.optimized)}`}>
                      {designation}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {server.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {server.provider}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {server.category}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {server.tools_count} tools • {server.resources_count} resources
                  </div>
                  {server.verified && (
                    <Badge className="bg-primary/10 text-primary">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedServer(server)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUse(server.id)}
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {mode === 'marketplace' ? 'Register' : 'Use'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
        </div>

        {filteredServers.length === 0 && (
          <Card className="section-padding text-center py-12">
            <p className="text-muted-foreground mb-4">No MCP servers found matching your criteria</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategories([]);
                setSelectedTypes([]);
              }}
            >
              Clear Filters
            </Button>
          </Card>
        )}
      </div>

      {/* Preview Modal */}
      <McpServerPreviewModal
        server={selectedServer}
        open={!!selectedServer}
        onOpenChange={() => setSelectedServer(null)}
        onUse={(serverId) => {
          handleUse(serverId);
          setSelectedServer(null);
        }}
      />
    </div>
  );
}
