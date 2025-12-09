import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Settings,
  ExternalLink,
  Zap,
  Code,
  Plug,
  Link2,
  Shield,
  Sparkles,
  Package,
  Users
} from "lucide-react";
import { Integration, IntegrationType } from "@/types/integrations";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Legacy exports for backward compatibility
export type IntegrationState = "connected" | "not-connected" | "error" | "auth-expired";
export type IntegrationCTA = "configure" | "zapier";

interface IntegrationCardProps {
  integration: Integration;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onConfigure?: () => void;
  onViewDetails?: () => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "connected":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "error":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "expired":
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case "pending":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "connected":
      return "text-success border-success/20 bg-success/10";
    case "error":
      return "text-destructive border-destructive/20 bg-destructive/10";
    case "expired":
      return "text-orange-500 border-orange-500/20 bg-orange-500/10";
    default:
      return "text-muted-foreground border-border bg-muted/50";
  }
};

const getTypeIcon = (type: IntegrationType) => {
  switch (type) {
    case "zapier":
      return <Zap className="h-4 w-4" />;
    case "api":
      return <Code className="h-4 w-4" />;
    case "mcp":
      return <Plug className="h-4 w-4" />;
    case "native":
      return <Link2 className="h-4 w-4" />;
    default:
      return null;
  }
};

const getDesignationIcon = (designation?: string) => {
  if (!designation) return null;
  if (designation.includes("Optimized")) return <Sparkles className="h-3 w-3" />;
  if (designation.includes("Verified")) return <Shield className="h-3 w-3" />;
  if (designation.includes("Starter")) return <Package className="h-3 w-3" />;
  if (designation.includes("Community")) return <Users className="h-3 w-3" />;
  return null;
};

export function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onConfigure,
  onViewDetails,
}: IntegrationCardProps) {
  const isConnected = integration.status === "connected";
  const hasError = integration.status === "error" || integration.status === "expired";

  return (
    <Card className="section-padding hover:border-accent transition-smooth h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Logo/Icon */}
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          {integration.logo_url ? (
            <img 
              src={integration.logo_url} 
              alt={integration.name} 
              className="w-6 h-6 object-contain" 
            />
          ) : integration.icon ? (
            <span className="text-2xl">{integration.icon}</span>
          ) : (
            getTypeIcon(integration.type)
          )}
        </div>

        {/* Title & Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium truncate">{integration.name}</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${getStatusColor(integration.status)}`}>
                    {getStatusIcon(integration.status)}
                    <span className="capitalize">{integration.status}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {integration.status === "connected" && "Integration is active and working"}
                  {integration.status === "error" && integration.error_message}
                  {integration.status === "expired" && "Authentication expired - reconnect required"}
                  {integration.status === "available" && "Ready to connect"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Type & Designation */}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              {getTypeIcon(integration.type)}
              <span className="capitalize">{integration.type}</span>
            </Badge>
            {integration.designation && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                {getDesignationIcon(integration.designation)}
                <span>{integration.designation}</span>
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {integration.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {integration.description}
        </p>
      )}

      {/* Tags */}
      {integration.tags && integration.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {integration.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {integration.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{integration.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Stats/Capabilities */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        {integration.type === "mcp" && integration.config.capabilities && (
          <>
            <span>{integration.config.capabilities.tools || 0} tools</span>
            <span>•</span>
            <span>{integration.config.capabilities.resources || 0} resources</span>
          </>
        )}
        {integration.type === "zapier" && (
          <>
            {integration.triggers && <span>{integration.triggers} triggers</span>}
            {integration.triggers && integration.actions && <span>•</span>}
            {integration.actions && <span>{integration.actions} actions</span>}
          </>
        )}
        {integration.category && (
          <>
            <Badge variant="secondary" className="text-xs">
              {integration.category}
            </Badge>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto flex gap-2">
        {isConnected ? (
          <>
            {onConfigure && (
              <Button
                variant="outline"
                size="sm"
                onClick={onConfigure}
                className="flex-1"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            )}
            {onDisconnect && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDisconnect}
              >
                Disconnect
              </Button>
            )}
          </>
        ) : (
          <>
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewDetails}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Details
              </Button>
            )}
            {onConnect && (
              <Button
                size="sm"
                onClick={onConnect}
                disabled={hasError}
                className="flex-1"
              >
                Connect
              </Button>
            )}
          </>
        )}
      </div>

      {/* Error Message */}
      {hasError && integration.error_message && (
        <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
          {integration.error_message}
        </div>
      )}
    </Card>
  );
}
