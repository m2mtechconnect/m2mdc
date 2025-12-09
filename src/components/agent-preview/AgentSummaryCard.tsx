import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/formatters';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Brain,
  Plug,
  Settings,
  BookOpen,
  FileText,
  Lock,
  CheckCircle2,
  ExternalLink,
  Shield,
  Cloud,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MCPServer {
  name: string;
  provider: string;
  category: string;
  authType: string;
  endpoint?: string;
  verified?: boolean;
}

interface AgentSummaryCardProps {
  description?: string;
  llmModel?: string;
  llmProvider?: string;
  temperature?: number;
  mcpServers?: MCPServer[];
  toolsCount?: number;
  resourcesCount?: number;
  promptsCount?: number;
  features?: string[];
  setupInstructions?: string[];
  compatibility?: {
    mcpEnabled: boolean;
    llmCompatible: string[];
    cloudReady: boolean;
    enterpriseSecure: boolean;
  };
  lastUpdated?: string;
  onConnectServer?: (server: MCPServer) => void;
}

export function AgentSummaryCard({
  description,
  llmModel = "Gemini 2.5 Flash",
  llmProvider = "Google",
  temperature = 0.7,
  mcpServers = [],
  toolsCount = 0,
  resourcesCount = 0,
  promptsCount = 0,
  features = [],
  setupInstructions = [],
  compatibility = {
    mcpEnabled: true,
    llmCompatible: ['Gemini', 'OpenAI'],
    cloudReady: true,
    enterpriseSecure: true,
  },
  lastUpdated,
  onConnectServer,
}: AgentSummaryCardProps) {
  const [showEndpointModal, setShowEndpointModal] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<MCPServer | null>(null);

  const handleViewEndpoint = (server: MCPServer) => {
    setSelectedEndpoint(server);
    setShowEndpointModal(true);
  };

  return (
    <>
      <Card className="p-6 bg-card/50 border-border/40 backdrop-blur-sm animate-fade-in">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-h3 font-semibold mb-1">Agent Summary</h3>
            <div className="h-1 w-20 bg-gradient-to-r from-[hsl(var(--gold-500))] to-[hsl(var(--electric-blue-500))] rounded-full" />
          </div>

          {/* Agent Purpose */}
          {description && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Agent Purpose
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          )}

          {/* Model & Intelligence */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Model & Intelligence
              </h4>
              <div className="space-y-2 text-sm">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex justify-between items-center p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-help">
                        <span className="text-muted-foreground">LLM Model:</span>
                        <Badge variant="outline" className="font-mono">
                          {llmModel}
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Provider: {llmProvider}</p>
                      <p>Temperature: {temperature}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                  <span className="text-muted-foreground">MCP Servers:</span>
                  <span className="font-medium">{mcpServers.length}</span>
                </div>

                {mcpServers.slice(0, 2).map((server, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs mr-2"
                  >
                    {server.name}
                    {server.verified && (
                      <Shield className="h-3 w-3 ml-1 text-[hsl(var(--gold-500))]" />
                    )}
                  </Badge>
                ))}

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center p-2 rounded-md bg-background border border-border/40">
                    <Settings className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-xs font-medium">{toolsCount}</p>
                    <p className="text-xs text-muted-foreground">Tools</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-background border border-border/40">
                    <BookOpen className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-xs font-medium">{resourcesCount}</p>
                    <p className="text-xs text-muted-foreground">Resources</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-background border border-border/40">
                    <FileText className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-xs font-medium">{promptsCount}</p>
                    <p className="text-xs text-muted-foreground">Prompts</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Server Details */}
            {mcpServers.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Plug className="h-4 w-4 text-primary" />
                  Server Details
                </h4>
                <div className="space-y-2 text-sm">
                  {mcpServers.slice(0, 1).map((server, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Provider:</span>
                        <span className="font-medium">{server.provider}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Category:</span>
                        <Badge variant="outline">{server.category}</Badge>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-between items-center p-2 rounded-md bg-muted/50 cursor-help">
                              <span className="text-muted-foreground">Authentication:</span>
                              <div className="flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                <span className="text-xs">{server.authType}</span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Credential type: {server.authType}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {server.endpoint && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleViewEndpoint(server)}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          View Endpoint
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Key Features */}
          {features.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Key Features
              </h4>
              <div className="grid gap-2">
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--secondary))] mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          {setupInstructions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Setup Instructions</h4>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                {setupInstructions.map((instruction, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {instruction}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Compatibility */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Compatibility</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col items-center p-3 rounded-lg bg-background border border-border/40">
                <Plug className={`h-5 w-5 mb-2 ${compatibility.mcpEnabled ? 'text-[hsl(var(--secondary))]' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium">MCP Protocol</p>
                <p className="text-xs text-muted-foreground">
                  {compatibility.mcpEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-background border border-border/40">
                <Brain className="h-5 w-5 mb-2 text-[hsl(var(--secondary))]" />
                <p className="text-xs font-medium">LLM</p>
                <p className="text-xs text-muted-foreground">
                  {compatibility.llmCompatible.join('/')}
                </p>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-background border border-border/40">
                <Cloud className={`h-5 w-5 mb-2 ${compatibility.cloudReady ? 'text-[hsl(var(--secondary))]' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium">Cloud Ready</p>
                <p className="text-xs text-muted-foreground">
                  {compatibility.cloudReady ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-background border border-border/40">
                <Shield className={`h-5 w-5 mb-2 ${compatibility.enterpriseSecure ? 'text-[hsl(var(--gold-500))]' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium">Enterprise</p>
                <p className="text-xs text-muted-foreground">
                  {compatibility.enterpriseSecure ? 'Secure' : 'Standard'}
                </p>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground text-center">
              Last Updated: {formatDate(lastUpdated)}
            </p>
          </div>
        </div>
      </Card>

      {/* Endpoint Modal */}
      <Dialog open={showEndpointModal} onOpenChange={setShowEndpointModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Server Endpoint</DialogTitle>
            <DialogDescription>
              {selectedEndpoint?.name} - {selectedEndpoint?.provider}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Endpoint URL</p>
              <code className="block p-3 rounded-md bg-muted text-sm font-mono break-all">
                {selectedEndpoint?.endpoint}
              </code>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Example Payload</p>
              <code className="block p-3 rounded-md bg-muted text-xs font-mono whitespace-pre-wrap">
{`{
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
  },
  "body": {
    "action": "query",
    "parameters": {}
  }
}`}
              </code>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigator.clipboard.writeText(selectedEndpoint?.endpoint || '')}
              >
                Copy Endpoint
              </Button>
              {onConnectServer && selectedEndpoint && (
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    onConnectServer(selectedEndpoint);
                    setShowEndpointModal(false);
                  }}
                >
                  Connect Server
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
