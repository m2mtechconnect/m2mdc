import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Crown, MoreVertical, AlertCircle, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber } from "@/lib/formatters";

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
  connection_info?: any;
}

interface ZapierAppCardProps {
  app: ZapierApp;
  viewMode: "grid" | "list";
  onConnect: (appId: string) => void;
  onDisconnect: (appId: string) => void;
}

export function ZapierAppCard({ app, viewMode, onConnect, onDisconnect }: ZapierAppCardProps) {
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${formatNumber(count / 1000000, 1)}M`;
    if (count >= 1000) return `${formatNumber(count / 1000, 0)}K`;
    return formatNumber(count, 0);
  };

  if (viewMode === "list") {
    return (
      <div className="group relative flex items-center gap-4 px-4 py-3 border-b border-border bg-card hover:bg-accent/50 transition-colors">
        {/* Checkbox placeholder */}
        <div className="w-4 h-4 border-2 border-border rounded flex-shrink-0" />
        
        {/* App Icon */}
        <div className="w-10 h-10 flex items-center justify-center bg-background rounded-md flex-shrink-0 border border-border">
          {app.logo_url ? (
            <img
              src={app.logo_url}
              alt={`${app.name} logo`}
              className="w-8 h-8 object-contain"
              draggable="false"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLDivElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="w-8 h-8 flex items-center justify-center text-sm font-semibold text-muted-foreground"
            style={{ display: app.logo_url ? 'none' : 'flex' }}
          >
            {app.name.charAt(0)}
          </div>
        </div>

        {/* Integration Icon */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Plus className="h-3 w-3 text-muted-foreground" />
          <div className="w-8 h-8 flex items-center justify-center bg-muted/50 rounded border border-border">
            <span className="text-xs font-semibold text-muted-foreground">AI</span>
          </div>
        </div>

        {/* Name & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium text-sm text-foreground truncate">{app.name}</h3>
            {app.premium && <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
            {app.is_connected ? (
              <Badge variant="success" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Available</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {app.description}
          </p>
        </div>

        {/* Owner/Info */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0 w-32">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
            {app.name.charAt(0)}
          </div>
          <span className="text-xs text-muted-foreground truncate">System</span>
        </div>

        {/* Status Badges */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0 w-24">
          {app.connections_count > 10000 && (
            <Badge variant="outline" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1 text-yellow-500" />
              Active
            </Badge>
          )}
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch
            checked={app.is_connected || false}
            onCheckedChange={(checked) => {
              if (checked) {
                onConnect(app.id);
              } else {
                onDisconnect(app.id);
              }
            }}
          />
          <span className="text-xs text-muted-foreground min-w-[32px]">
            {app.is_connected ? 'On' : 'Off'}
          </span>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => app.is_connected ? onDisconnect(app.id) : onConnect(app.id)}>
              {app.is_connected ? 'Disconnect' : 'Connect'}
            </DropdownMenuItem>
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Grid view
  return (
    <div className="group p-6 border border-border rounded-lg bg-card hover:shadow-lg hover:border-primary/20 transition-all">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 flex items-center justify-center bg-background rounded-lg flex-shrink-0 border border-border">
            {app.logo_url ? (
              <img
                src={app.logo_url}
                alt={`${app.name} logo`}
                className="w-10 h-10 object-contain"
                draggable="false"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLDivElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="w-10 h-10 flex items-center justify-center text-lg font-semibold text-muted-foreground"
              style={{ display: app.logo_url ? 'none' : 'flex' }}
            >
              {app.name.charAt(0)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {app.premium && <Crown className="h-4 w-4 text-yellow-500" />}
            {app.is_connected ? (
              <Badge variant="success" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Available</Badge>
            )}
          </div>
        </div>

        {/* Name & Description */}
        <div>
          <h3 className="font-semibold text-base text-foreground mb-1">{app.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {app.description}
          </p>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 flex-wrap min-h-[24px]">
          {app.category.slice(0, 2).map((cat) => (
            <Badge key={cat} variant="secondary" className="text-xs">
              {cat}
            </Badge>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <span className="flex items-center gap-1">
            {formatCount(app.connections_count)}+ users
          </span>
          <span className="capitalize px-2 py-1 bg-muted/50 rounded">{app.pricing_tier}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant={app.is_connected ? "outline" : "default"}
            className="flex-1"
            size="sm"
            onClick={() => app.is_connected ? onDisconnect(app.id) : onConnect(app.id)}
          >
            {app.is_connected ? 'Disconnect' : 'Connect'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Capabilities */}
        {(app.supports_triggers || app.supports_actions) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
            {app.supports_triggers && <span className="flex items-center gap-1">✓ Triggers</span>}
            {app.supports_actions && <span className="flex items-center gap-1">✓ Actions</span>}
          </div>
        )}
      </div>
    </div>
  );
}