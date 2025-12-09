import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Server, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Radio,
  Shield,
  Workflow
} from "lucide-react";
import { useMcpServersStore } from "@/stores/mcpServersStore";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AgentMCPServersProps {
  agentId: string;
}

export function AgentMCPServers({ agentId }: AgentMCPServersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const queryClient = useQueryClient();
  
  const { servers, loadServers, isLoading: serversLoading } = useMcpServersStore();

  // Fetch agent's connected servers
  const { data: agentConnections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['agent-mcp-connections', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_integrations')
        .select('*')
        .eq('system_id', agentId)
        .eq('provider', 'mcp');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch MCP servers if not loaded
  useState(() => {
    if (servers.length === 0) loadServers();
  });

  // Real-time subscription for connection status updates
  useEffect(() => {
    const channel = supabase
      .channel(`agent-mcp-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_integrations',
          filter: `system_id=eq.${agentId}`
        },
        (payload) => {
          console.log('MCP connection change:', payload);
          // Invalidate and refetch the connections query
          queryClient.invalidateQueries({ queryKey: ['agent-mcp-connections', agentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, queryClient]);

  const getConnectionStatus = (serverId: string) => {
    const connection = agentConnections.find(c => c.connection_id === serverId);
    return connection?.status || 'available';
  };

  const getToolsCount = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    return server?.capabilities?.tools || 0;
  };

  const handleConnect = async (serverId: string) => {
    try {
      const { error } = await supabase
        .from('agent_integrations')
        .insert({
          system_id: agentId,
          connection_id: serverId,
          provider: 'mcp',
          status: 'active',
          capabilities: { tools: getToolsCount(serverId) }
        });

      if (error) throw error;
      toast.success("MCP Server connected successfully");
    } catch (error) {
      console.error('Error connecting server:', error);
      toast.error("Failed to connect MCP server");
    }
  };

  const handleDisconnect = async (serverId: string) => {
    try {
      const { error } = await supabase
        .from('agent_integrations')
        .delete()
        .eq('system_id', agentId)
        .eq('connection_id', serverId)
        .eq('provider', 'mcp');

      if (error) throw error;
      toast.success("MCP Server disconnected");
    } catch (error) {
      console.error('Error disconnecting server:', error);
      toast.error("Failed to disconnect MCP server");
    }
  };

  const handleTest = async (serverId: string) => {
    try {
      toast.loading("Testing connection...");
      const { data, error } = await supabase.functions.invoke('mcp-test-tool', {
        body: { serverId }
      });
      
      if (error) throw error;
      toast.success(`Connection test successful. Latency: ${data?.latency || 'N/A'}ms`);
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error("Connection test failed");
    }
  };

  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         server.description.toLowerCase().includes(searchQuery.toLowerCase());
    const status = getConnectionStatus(server.id);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    const matchesCategory = selectedCategory === 'all' || server.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate category counts
  const categories = ['all', ...Array.from(new Set(servers.map(s => s.category)))];
  const categoryCounts = categories.reduce((acc, cat) => {
    if (cat === 'all') {
      acc[cat] = servers.length;
    } else {
      acc[cat] = servers.filter(s => s.category.toLowerCase() === cat.toLowerCase()).length;
    }
    return acc;
  }, {} as Record<string, number>);

  const connectedCount = agentConnections.length;
  const totalTools = agentConnections.reduce((sum, conn) => {
    const caps = conn.capabilities as any;
    return sum + (caps?.tools || 0);
  }, 0);

  if (serversLoading || connectionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-background to-muted/30 rounded-xl border">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            MCP Servers
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Link external MCP servers to extend the agent's tools and compute
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{connectedCount}</div>
          <div className="text-xs text-muted-foreground">
            Connected • {totalTools} tools
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Categories</label>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            const count = categoryCounts[category] || 0;
            return (
              <Button
                key={category}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full transition-all duration-200 ${
                  isActive ? 'shadow-lg' : 'hover:shadow-md'
                }`}
              >
                <span className="capitalize">{category}</span>
                <Badge 
                  variant={isActive ? "secondary" : "outline"} 
                  className="ml-2 rounded-full"
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search MCP servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Servers</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
      {filteredServers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No MCP Servers yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Connect one to give your agent external tools and compute
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Connect MCP Server
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Server Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredServers.map((server) => {
          const status = getConnectionStatus(server.id);
          const isConnected = status === 'active' || status === 'connected';

          return (
            <Card 
              key={server.id} 
              className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-muted bg-gradient-to-br from-background to-muted/10"
            >
              {server.featured && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="gap-1 shadow-sm">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {server.logo ? (
                        <img src={server.logo} alt="" className="h-5 w-5 rounded" />
                      ) : (
                        <Server className="h-5 w-5" />
                      )}
                      {server.name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {server.category} • {server.capabilities.tools} tools
                    </CardDescription>
                  </div>
                  <StatusBadge status={status} />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {server.description}
                </p>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Workflow className="h-3 w-3" />
                  Auth: {server.auth_method}
                </div>

                {server.tags && server.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {server.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {isConnected ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTest(server.id)}
                        className="flex-1"
                      >
                        Test Connection
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDisconnect(server.id)}
                        className="flex-1"
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(server.id)}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
