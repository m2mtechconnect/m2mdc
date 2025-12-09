import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plug2, CheckCircle2, Crown } from "lucide-react";

interface IntegrationAppCardProps {
  app: {
    id: string;
    name: string;
    description: string;
    category: string[] | string;
    premium?: boolean;
    logo_url?: string;
    is_connected?: boolean;
    connections_count?: number;
  };
  mode: "marketplace" | "builder";
  onConnect: (app: any) => void;
  animationDelay?: number;
}

export function IntegrationAppCard({ 
  app, 
  mode, 
  onConnect,
  animationDelay = 0 
}: IntegrationAppCardProps) {
  const category = Array.isArray(app.category) ? app.category[0] : app.category;
  
  return (
    <Card
      className="hover:shadow-lg transition-all hover:scale-105 hover:-translate-y-1 hover:border-secondary animate-scale-in"
      style={{ animationDelay: `${animationDelay}ms` }}
      data-testid="integration-card"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {category}
          </Badge>
          {app.premium && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          )}
          {app.is_connected && (
            <Badge variant="default" className="text-xs flex items-center gap-1 bg-green-600">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mb-2">
          {app.logo_url && (
            <img 
              src={app.logo_url} 
              alt={app.name}
              className="w-10 h-10 rounded-md object-contain bg-card-foreground/5 p-1"
            />
          )}
          <CardTitle className="text-lg">{app.name}</CardTitle>
        </div>
        <CardDescription className="text-sm line-clamp-2">
          {app.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {app.connections_count !== undefined && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{app.connections_count.toLocaleString()}</span>
            <span> active connections</span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          size="sm"
          onClick={() => onConnect(app)}
          className="w-full"
          disabled={app.is_connected}
        >
          <Plug2 className="h-4 w-4 mr-2" />
          {app.is_connected 
            ? "Connected" 
            : mode === "marketplace" 
              ? "Connect in Builder" 
              : "Connect App"
          }
        </Button>
      </CardFooter>
    </Card>
  );
}
