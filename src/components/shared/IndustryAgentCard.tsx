import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Rocket, Star, TrendingUp, Download, Shield } from "lucide-react";

interface IndustryAgentCardProps {
  agent: {
    id: string;
    name: string;
    description?: string;
    industry: string;
    certified?: boolean;
    rating?: number;
    roi_pct?: number;
    downloads?: number;
  };
  mode: "marketplace" | "builder";
  onPreview: (agent: any) => void;
  onUse: (agent: any) => void;
  animationDelay?: number;
}

export function IndustryAgentCard({ 
  agent, 
  mode, 
  onPreview, 
  onUse,
  animationDelay = 0 
}: IndustryAgentCardProps) {
  return (
    <Card
      className="hover:shadow-lg transition-all hover:scale-105 hover:-translate-y-1 hover:border-secondary animate-scale-in"
      style={{ animationDelay: `${animationDelay}ms` }}
      data-testid="industry-card"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {agent.industry}
          </Badge>
          {agent.certified && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Certified
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg">{agent.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {agent.description || 'No description available'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm text-muted-foreground">
          {agent.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              <span>{agent.rating.toFixed(1)}</span>
            </div>
          )}
          {agent.roi_pct !== undefined && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span>ROI: {agent.roi_pct}%</span>
            </div>
          )}
          {agent.downloads !== undefined && (
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              <span>{agent.downloads}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreview(agent)}
          className="flex-1"
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button
          size="sm"
          onClick={() => onUse(agent)}
          className="flex-1"
        >
          <Rocket className="h-4 w-4 mr-2" />
          {mode === "marketplace" ? "Use in Builder" : "Use Template"}
        </Button>
      </CardFooter>
    </Card>
  );
}
