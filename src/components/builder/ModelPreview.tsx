import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, ArrowRight, CheckCircle2, Zap, TrendingUp } from "lucide-react";
import { models, ModelConfig } from "./ModelMarketplace";

interface ModelPreviewProps {
  selectedModelId: string | null;
  onNavigateToConfig?: () => void;
  showChangeButton?: boolean;
}

export function ModelPreview({ 
  selectedModelId, 
  onNavigateToConfig,
  showChangeButton = true 
}: ModelPreviewProps) {
  const selectedModel = models?.find(m => m.id === selectedModelId);

  if (!selectedModel) {
    return (
      <Card className="glass-panel border-dashed border-muted-foreground/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-muted-foreground" />
              No Model Selected
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Select an AI model in Step 3: Configure Intelligence
          </p>
          {showChangeButton && onNavigateToConfig && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onNavigateToConfig}
              className="w-full gap-2"
            >
              Select Model
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const getPricingColor = (pricing: string) => {
    switch (pricing) {
      case "free": return "bg-secondary/20 text-secondary-foreground";
      case "low": return "bg-primary/20 text-primary-foreground";
      case "medium": return "bg-accent/20 text-accent-foreground";
      case "high": return "bg-destructive/20 text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case "fast": return <Zap className="h-4 w-4 text-primary" />;
      case "medium": return <TrendingUp className="h-4 w-4 text-accent" />;
      case "slow": return <Brain className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <Card className="glass-panel border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Selected Model
          </CardTitle>
          {selectedModel.recommended && (
            <Badge className="bg-gradient-to-r from-primary to-secondary text-primary-foreground border-0">
              Recommended
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="font-semibold text-lg mb-1">{selectedModel.name}</div>
            <div className="text-sm text-muted-foreground mb-2">{selectedModel.provider}</div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {selectedModel.description}
            </p>
          </div>
          {getSpeedIcon(selectedModel.speed)}
        </div>

        {/* Capabilities */}
        <div className="flex flex-wrap gap-1.5">
          {selectedModel.capabilities.map(cap => (
            <Badge
              key={cap}
              variant="outline"
              className="text-xs bg-secondary/10 border-secondary/30"
            >
              {cap}
            </Badge>
          ))}
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div>
            <div className="text-xs text-muted-foreground">Context Window</div>
            <div className="text-sm font-mono">{selectedModel.contextWindow}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pricing</div>
            <Badge variant="outline" className={`text-xs ${getPricingColor(selectedModel.pricing)}`}>
              {selectedModel.pricingDetails?.split('/')?.[0] || selectedModel.pricingDetails || 'N/A'}
            </Badge>
          </div>
        </div>

        {/* RAG Settings */}
        <div className="pt-3 border-t border-border">
          <div className="text-xs font-semibold text-muted-foreground mb-2">RAG Configuration</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Top-K:</span>
              <span className="ml-1 font-mono">{selectedModel.ragSettings.topK}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Top-N:</span>
              <span className="ml-1 font-mono">{selectedModel.ragSettings.topN}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Temp:</span>
              <span className="ml-1 font-mono">{selectedModel.ragSettings.temperature}</span>
            </div>
          </div>
        </div>

        {showChangeButton && onNavigateToConfig && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onNavigateToConfig}
            className="w-full gap-2 mt-4"
          >
            Change in Configure AI
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
