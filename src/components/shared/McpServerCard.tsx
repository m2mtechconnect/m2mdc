import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Plug2, Shield, Sparkles, Package, Users } from "lucide-react";

interface McpServerCardProps {
  server: {
    id: string;
    name: string;
    designation: string;
    category: string;
    description: string;
    logo?: string;
    capabilities?: {
      tools: number;
      resources: number;
      prompts: number;
    };
  };
  mode: "marketplace" | "builder";
  onPreview: (server: any) => void;
  onConnect: (server: any) => void;
  animationDelay?: number;
}

const getDesignationIcon = (designation: string) => {
  switch (designation) {
    case "optimized": return Sparkles;
    case "starter": return Package;
    case "verified": return Shield;
    case "community": return Users;
    default: return Shield;
  }
};

const getDesignationLabel = (designation: string) => {
  switch (designation) {
    case "optimized": return "Arcade Optimized";
    case "starter": return "Arcade Starter";
    case "verified": return "Verified";
    case "community": return "Community";
    default: return designation;
  }
};

export function McpServerCard({ 
  server, 
  mode, 
  onPreview, 
  onConnect,
  animationDelay = 0 
}: McpServerCardProps) {
  const DesignationIcon = getDesignationIcon(server.designation);
  
  return (
    <Card
      className="hover:shadow-lg transition-all hover:scale-105 hover:-translate-y-1 hover:border-secondary animate-scale-in"
      style={{ animationDelay: `${animationDelay}ms` }}
      data-testid="mcp-server-card"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {server.category}
          </Badge>
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <DesignationIcon className="h-3 w-3" />
            {getDesignationLabel(server.designation)}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mb-2">
          {server.logo && (
            <img 
              src={server.logo} 
              alt={server.name}
              className="w-10 h-10 rounded-md object-contain bg-card-foreground/5 p-1"
            />
          )}
          <CardTitle className="text-lg">{server.name}</CardTitle>
        </div>
        <CardDescription className="text-sm line-clamp-2">
          {server.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {server.capabilities && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="font-medium">{server.capabilities.tools}</span>
              <span>tools</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">{server.capabilities.resources}</span>
              <span>resources</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">{server.capabilities.prompts}</span>
              <span>prompts</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreview(server)}
          className="flex-1"
        >
          <Eye className="h-4 w-4 mr-2" />
          Details
        </Button>
        <Button
          size="sm"
          onClick={() => onConnect(server)}
          className="flex-1"
        >
          <Plug2 className="h-4 w-4 mr-2" />
          {mode === "marketplace" ? "Connect in Builder" : "Connect Server"}
        </Button>
      </CardFooter>
    </Card>
  );
}
