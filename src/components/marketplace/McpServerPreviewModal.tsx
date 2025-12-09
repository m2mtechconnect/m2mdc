import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Server, Shield, Zap, Wrench, FileText, Key, Rocket, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useBuilderSelectionStore } from '@/stores/builderSelectionStore';
import { normalizeMcpServer } from '@/lib/marketplaceNormalizer';
import { formatDate } from '@/lib/formatters';

interface McpServerPreviewModalProps {
  server: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: (serverId: string) => void;
}

export function McpServerPreviewModal({ server, open, onOpenChange, onUse }: McpServerPreviewModalProps) {
  const navigate = useNavigate();
  const { setSelection, setNormalizedApp } = useBuilderSelectionStore();

  if (!server) return null;

  const handleUseInBuilder = () => {
    // Normalize and store selection
    const normalized = normalizeMcpServer(server);
    setNormalizedApp(normalized);
    setSelection({
      originTab: 'mcp',
      itemId: server.id,
      itemVersion: server.updated_at,
      payload: server,
      timestamp: Date.now(),
    });

    // Navigate with deep link
    navigate(`/builder?stage=3&tab=mcp&id=${server.id}&v=${encodeURIComponent(server.updated_at || '')}`);
    onOpenChange(false);
    
    // Fallback: call original onUse if provided
    if (onUse) {
      onUse(server.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {server.logo_url ? (
              <img src={server.logo_url} alt={server.name} className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                <Server className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <DialogTitle className="text-2xl">{server.name}</DialogTitle>
                <div className="flex gap-1">
                  {server.verified && (
                    <Badge variant="default" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  {server.optimized && (
                    <Badge variant="secondary" className="gap-1">
                      <Zap className="h-3 w-3" />
                      Optimized
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                <Badge variant="outline">{server.category}</Badge>
                <Badge variant="outline">{server.provider}</Badge>
              </div>
              <DialogDescription className="text-base mt-2">
                {server.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {/* Capabilities Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <Wrench className="h-4 w-4" />
                  <span className="font-semibold">{server.tools_count || 0}</span>
                </div>
                <span className="text-xs text-muted-foreground">Tools</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="font-semibold">{server.resources_count || 0}</span>
                </div>
                <span className="text-xs text-muted-foreground">Resources</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="font-semibold">{server.prompts_count || 0}</span>
                </div>
                <span className="text-xs text-muted-foreground">Prompts</span>
              </div>
            </div>

            <Separator />

            {/* Server Details */}
            <div>
              <h4 className="font-semibold mb-3">Server Details</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-medium">{server.provider}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">{server.category}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Authentication:</span>
                  <Badge variant="outline" className="gap-1">
                    <Key className="h-3 w-3" />
                    {server.auth_type}
                  </Badge>
                </div>
                {server.endpoint && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Endpoint:</span>
                    <a 
                      href={server.endpoint} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      View Endpoint
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div>
              <h4 className="font-semibold mb-3">Key Features</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                  <span>{server.tools_count} powerful tools for enhanced functionality</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                  <span>{server.resources_count} resources for seamless integration</span>
                </div>
                {server.verified && (
                  <div className="flex items-start gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                    <span>Verified by M2M for security and reliability</span>
                  </div>
                )}
                {server.optimized && (
                  <div className="flex items-start gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                    <span>Optimized for maximum performance</span>
                  </div>
                )}
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Server className="h-4 w-4" />
                Setup Instructions
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                This MCP server requires <strong>{server.auth_type}</strong> authentication.
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Click "Connect Server" to start the integration process</li>
                <li>Provide the required authentication credentials</li>
                <li>Configure server settings and permissions</li>
                <li>Test the connection to ensure proper functionality</li>
              </ol>
            </div>

            {/* Compatibility */}
            <div>
              <h4 className="font-semibold mb-3">Compatibility</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">MCP Protocol</Badge>
                <Badge variant="outline">{server.category}</Badge>
                <Badge variant="outline">{server.auth_type}</Badge>
                {server.verified && <Badge variant="outline">Enterprise Ready</Badge>}
              </div>
            </div>

            {/* Version & Updated */}
            <div className="text-xs text-muted-foreground">
              Last updated: {formatDate(server.updated_at, 'short')}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
          <Button onClick={handleUseInBuilder} className="gap-2">
            <Rocket className="h-4 w-4" />
            Use in Builder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
