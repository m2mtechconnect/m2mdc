import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import { useManualTokenRefresh } from "@/hooks/useTokenRefresh";
import { Loader2, CheckCircle2, AlertCircle, Plug, Activity, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface ZapierApp {
  id: string;
  name: string;
  logo_url?: string;
  description: string;
  category: string;
  status: 'connected' | 'available' | 'error';
}

interface Capability {
  id: string;
  label: string;
  type: 'trigger' | 'action';
}

interface ZapierIntegrationCardProps {
  app: ZapierApp;
  systemId: string;
  connectionId?: string;
  onStatusChange?: () => void;
}

const CAPABILITIES: Record<string, Capability[]> = {
  slack: [
    { id: 'new_message', label: 'New message in channel', type: 'trigger' },
    { id: 'post_message', label: 'Post message', type: 'action' },
    { id: 'send_dm', label: 'Send direct message', type: 'action' },
  ],
  gmail: [
    { id: 'new_email', label: 'New email received', type: 'trigger' },
    { id: 'send_email', label: 'Send email', type: 'action' },
  ],
  hubspot: [
    { id: 'new_contact', label: 'New contact created', type: 'trigger' },
    { id: 'create_contact', label: 'Create contact', type: 'action' },
    { id: 'update_deal', label: 'Update deal', type: 'action' },
  ],
};

export function ZapierIntegrationCard({ app, systemId, connectionId, onStatusChange }: ZapierIntegrationCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const { toast } = useToast();
  const { refreshToken } = useManualTokenRefresh();

  const capabilities = CAPABILITIES[app.id.toLowerCase()] || [];

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const data = await invokeEdgeFunction('zapier-oauth-connect', { appId: app.id, systemId });

      if (data.authUrl) {
        // Open OAuth popup if URL provided
        window.open(data.authUrl, '_blank', 'width=600,height=700');
        toast({
          title: "Connection initiated",
          description: "Complete the authorization in the popup window",
        });
      } else if (data.success) {
        // Direct connection (for MVP/mock connections)
        toast({
          title: "Connection successful",
          description: data.message || `${app.name} connected successfully`,
        });
        
        // Refresh status immediately
        setTimeout(() => onStatusChange?.(), 500);
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const data = await invokeEdgeFunction('zapier-test-connection', { appId: app.id, systemId });

      toast({
        title: "Connection verified",
        description: `${app.name} is working correctly`,
      });
    } catch (error) {
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCapabilities = async () => {
    try {
      const triggers = selectedCapabilities.filter(id => 
        capabilities.find(c => c.id === id && c.type === 'trigger')
      );
      const actions = selectedCapabilities.filter(id => 
        capabilities.find(c => c.id === id && c.type === 'action')
      );

      const { error } = await supabase
        .from('agent_integrations')
        .upsert({
          system_id: systemId,
          provider: 'zapier',
          capabilities: { triggers, actions },
        }, {
          onConflict: 'system_id,provider',
        });

      if (error) throw error;

      toast({
        title: "Capabilities saved",
        description: `${triggers.length} triggers and ${actions.length} actions enabled`,
      });

      onStatusChange?.();
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save",
        variant: "destructive",
      });
    }
  };

  const handleRefreshToken = async () => {
    if (!connectionId) {
      toast({
        title: "No connection found",
        description: "Please connect first",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshing(true);
    try {
      await refreshToken(connectionId);
      onStatusChange?.();
    } catch (error) {
      // Error already handled by hook
    } finally {
      setIsRefreshing(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl">
              {app.logo_url ? (
                <img src={app.logo_url} alt={app.name} className="w-8 h-8" />
              ) : (
                app.name[0]
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{app.name}</CardTitle>
              <CardDescription>{app.description}</CardDescription>
            </div>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {app.status === 'available' && (
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Plug className="mr-2 h-4 w-4" />
                Connect Application
              </>
            )}
          </Button>
        )}

        {app.status === 'connected' && (
          <>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCapabilities(!showCapabilities)}
                variant="outline"
                className="flex-1"
              >
                <Activity className="mr-2 h-4 w-4" />
                Configure
              </Button>
              <Button
                onClick={handleTestConnection}
                disabled={isTesting}
                variant="outline"
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
              <Button
                onClick={handleRefreshToken}
                disabled={isRefreshing}
                variant="outline"
                size="icon"
                title="Refresh token"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>

            {showCapabilities && capabilities.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
              <div>
                <h4 className="font-medium mb-2 text-sm">Triggers</h4>
                <p className="text-xs text-muted-foreground mb-2">Events that invoke your agent</p>
                <div className="space-y-2">
                    {capabilities.filter(c => c.type === 'trigger').map(cap => (
                      <div key={cap.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={cap.id}
                          checked={selectedCapabilities.includes(cap.id)}
                          onCheckedChange={(checked) => {
                            setSelectedCapabilities(prev =>
                              checked
                                ? [...prev, cap.id]
                                : prev.filter(id => id !== cap.id)
                            );
                          }}
                        />
                        <Label htmlFor={cap.id} className="text-sm cursor-pointer">
                          {cap.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-sm">Actions</h4>
                  <p className="text-xs text-muted-foreground mb-2">What your agent can do</p>
                  <div className="space-y-2">
                    {capabilities.filter(c => c.type === 'action').map(cap => (
                      <div key={cap.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={cap.id}
                          checked={selectedCapabilities.includes(cap.id)}
                          onCheckedChange={(checked) => {
                            setSelectedCapabilities(prev =>
                              checked
                                ? [...prev, cap.id]
                                : prev.filter(id => id !== cap.id)
                            );
                          }}
                        />
                        <Label htmlFor={cap.id} className="text-sm cursor-pointer">
                          {cap.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSaveCapabilities} className="w-full">
                  Save Capabilities
                </Button>
              </div>
            )}
          </>
        )}

        {app.status === 'error' && (
          <div className="space-y-2">
            <Button onClick={handleConnect} variant="destructive" className="w-full">
              <AlertCircle className="mr-2 h-4 w-4" />
              Reconnect
            </Button>
            {connectionId && (
              <Button onClick={handleRefreshToken} variant="outline" className="w-full" disabled={isRefreshing}>
                {isRefreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Refresh Token
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}