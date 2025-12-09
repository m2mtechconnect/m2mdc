import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketplaceStore, McpServer } from '@/stores/marketplaceStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Server, Star, Award, Shield, Key } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface McpTabProps {
  searchQuery: string;
}

export function McpTab({ searchQuery }: McpTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mcps, selectForBuilder } = useMarketplaceStore();
  const [selectedMcp, setSelectedMcp] = useState<McpServer | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [designationFilter, setDesignationFilter] = useState<string>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const filteredMcps = mcps.filter((mcp) => {
    const matchesSearch = mcp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mcp.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || mcp.category === categoryFilter;
    const matchesDesignation = designationFilter === 'all' || mcp.designation === designationFilter;
    const matchesFeatured = !featuredOnly || mcp.featured;

    return matchesSearch && matchesCategory && matchesDesignation && matchesFeatured;
  });

  const categories = Array.from(new Set(mcps.map(m => m.category)));
  const designations = Array.from(new Set(mcps.map(m => m.designation)));

  const getDesignationIcon = (designation: string) => {
    if (designation.includes('Optimized')) return <Award className="h-3 w-3" />;
    if (designation.includes('Verified')) return <Shield className="h-3 w-3" />;
    if (designation.includes('Starter')) return <Star className="h-3 w-3" />;
    return <Server className="h-3 w-3" />;
  };

  const handleRegisterInBuilder = async (mcpId: string) => {
    try {
      // Create new system or use existing
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'Please sign in to continue', variant: 'destructive' });
        return;
      }

      const { data: system, error } = await supabase
        .from('agents')
        .insert({
          name: 'New AI System',
          description: 'Created from marketplace',
          owner_id: user.id,
          status: 'draft',
        })
        .select()
        .maybeSingle();

      if (error || !system) throw error || new Error('Failed to create system');

      const result = await selectForBuilder({
        type: 'mcp',
        id: mcpId,
        system_id: system.id,
      });

      if (result.success && result.nextStep) {
        navigate(result.nextStep);
        toast({ title: 'Success', description: 'MCP server registered to your system' });
      }
    } catch (error) {
      console.error('Error registering MCP:', error);
      toast({ title: 'Error', description: 'Failed to register MCP server', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={designationFilter} onValueChange={setDesignationFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Designation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Designations</SelectItem>
            {designations.map(designation => (
              <SelectItem key={designation} value={designation}>{designation}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={featuredOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFeaturedOnly(!featuredOnly)}
        >
          <Star className="h-4 w-4 mr-2" />
          Featured Only
        </Button>
      </div>

      {/* MCP Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMcps.map((mcp) => (
          <Card key={mcp.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{mcp.name}</CardTitle>
                  <Badge variant="secondary" className="mt-2">
                    {mcp.category}
                  </Badge>
                </div>
                {mcp.logo && (
                  <img src={mcp.logo} alt={mcp.name} className="h-12 w-12 object-contain" />
                )}
              </div>
              <CardDescription className="mt-2 line-clamp-2">
                {mcp.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Badge className="bg-[#3AB6FF]/10 text-[#3AB6FF] border-[#3AB6FF]/20">
                  {getDesignationIcon(mcp.designation)}
                  <span className="ml-1">{mcp.designation}</span>
                </Badge>
                <div className="flex flex-wrap gap-2">
                  {mcp.tags.includes('Auth Provider') && (
                    <Badge variant="outline">
                      <Key className="h-3 w-3 mr-1" />
                      Auth Provider
                    </Badge>
                  )}
                  {mcp.featured && (
                    <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <div>Tools: {mcp.capabilities.tools}</div>
                  <div>Resources: {mcp.capabilities.resources}</div>
                  <div>Prompts: {mcp.capabilities.prompts}</div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMcp(mcp)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                size="sm"
                onClick={() => handleRegisterInBuilder(mcp.id)}
                className="flex-1"
              >
                <Server className="h-4 w-4 mr-2" />
                Register
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredMcps.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No MCP servers found matching your criteria
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={!!selectedMcp} onOpenChange={() => setSelectedMcp(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-4">
              {selectedMcp?.logo && (
                <img src={selectedMcp.logo} alt={selectedMcp.name} className="h-16 w-16 object-contain" />
              )}
              <div>
                <DialogTitle className="text-2xl">{selectedMcp?.name}</DialogTitle>
                <DialogDescription>{selectedMcp?.designation}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{selectedMcp?.description}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Capabilities</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-muted p-3 rounded">
                  <div className="font-medium">{selectedMcp?.capabilities.tools}</div>
                  <div className="text-xs text-muted-foreground">Tools</div>
                </div>
                <div className="bg-muted p-3 rounded">
                  <div className="font-medium">{selectedMcp?.capabilities.resources}</div>
                  <div className="text-xs text-muted-foreground">Resources</div>
                </div>
                <div className="bg-muted p-3 rounded">
                  <div className="font-medium">{selectedMcp?.capabilities.prompts}</div>
                  <div className="text-xs text-muted-foreground">Prompts</div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Authentication</h3>
              <Badge variant="outline">{selectedMcp?.auth_method}</Badge>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {selectedMcp?.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setSelectedMcp(null)}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedMcp) {
                  handleRegisterInBuilder(selectedMcp.id);
                  setSelectedMcp(null);
                }
              }}
              className="flex-1"
            >
              <Server className="h-4 w-4 mr-2" />
              Register in Builder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
