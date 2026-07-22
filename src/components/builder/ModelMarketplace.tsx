import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRBAC } from "@/contexts/RBACContext";
import { logger } from "@/lib/logger";
import { handleError } from "@/lib/errorHandlers";
import { 
  CheckCircle2, 
  Search, 
  Zap, 
  DollarSign, 
  Brain, 
  TrendingUp, 
  Loader2,
  AlertCircle,
  MapPin,
  Plug
} from "lucide-react";

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: "free" | "low" | "medium" | "high";
  pricingDetails: string;
  capabilities: string[];
  contextWindow: string;
  speed: "fast" | "medium" | "slow";
  recommended?: boolean;
  supportedRegions: string[];
  requiresAuth: boolean;
  ragSettings: {
    topK: number;
    topN: number;
    temperature: number;
    hybridSearch: boolean;
  };
}

export const models: ModelConfig[] = [
  // Google Models
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    description: "Fast, efficient model for general-purpose tasks with excellent reasoning",
    pricing: "low",
    pricingDetails: "$0.075 / 1M input tokens",
    capabilities: ["Text", "Vision", "Multilingual", "RAG-optimized"],
    contextWindow: "1M tokens",
    speed: "fast",
    recommended: true,
    supportedRegions: ["northamerica-northeast1", "us-central1", "europe-west1"],
    requiresAuth: false,
    ragSettings: { topK: 20, topN: 6, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    description: "Advanced reasoning with multimodal capabilities for complex tasks",
    pricing: "medium",
    pricingDetails: "$1.25 / 1M input tokens",
    capabilities: ["Text", "Vision", "Code", "Advanced Reasoning"],
    contextWindow: "2M tokens",
    speed: "medium",
    supportedRegions: ["northamerica-northeast1", "us-central1", "europe-west1"],
    requiresAuth: false,
    ragSettings: { topK: 25, topN: 8, temperature: 0.6, hybridSearch: true }
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    description: "Fastest + cheapest of the Gemini 2.5 line. Good for classification, summarization",
    pricing: "low",
    pricingDetails: "$0.035 / 1M input tokens",
    capabilities: ["Text", "Classification", "Summarization"],
    contextWindow: "1M tokens",
    speed: "fast",
    supportedRegions: ["northamerica-northeast1", "us-central1"],
    requiresAuth: false,
    ragSettings: { topK: 15, topN: 5, temperature: 0.7, hybridSearch: true }
  },
  
  // OpenAI Models
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    description: "Powerful all-rounder. Excellent reasoning, long context, multimodal",
    pricing: "high",
    pricingDetails: "$2.50 / 1M input tokens",
    capabilities: ["Text", "Vision", "Advanced Reasoning", "Code"],
    contextWindow: "128K tokens",
    speed: "medium",
    recommended: true,
    supportedRegions: ["global"],
    requiresAuth: false,
    ragSettings: { topK: 20, topN: 7, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    description: "Middle ground: much lower cost & latency than standard but keeps most reasoning",
    pricing: "low",
    pricingDetails: "$0.15 / 1M input tokens",
    capabilities: ["Text", "Vision", "Code"],
    contextWindow: "128K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: false,
    ragSettings: { topK: 18, topN: 6, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "OpenAI",
    description: "Designed for speed & cost saving. Very efficient for high-volume/simple tasks",
    pricing: "low",
    pricingDetails: "$0.05 / 1M input tokens",
    capabilities: ["Text", "Classification", "Summarization"],
    contextWindow: "128K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: false,
    ragSettings: { topK: 15, topN: 5, temperature: 0.7, hybridSearch: true }
  },

  // Anthropic Models
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    description: "Most capable and intelligent model with superior reasoning and analysis",
    pricing: "high",
    pricingDetails: "$3.00 / 1M input tokens",
    capabilities: ["Text", "Vision", "Advanced Reasoning", "Code", "Analysis"],
    contextWindow: "200K tokens",
    speed: "medium",
    recommended: true,
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 25, topN: 8, temperature: 0.6, hybridSearch: true }
  },
  {
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    provider: "Anthropic",
    description: "Highly intelligent model with exceptional reasoning for complex tasks",
    pricing: "high",
    pricingDetails: "$15.00 / 1M input tokens",
    capabilities: ["Text", "Vision", "Advanced Reasoning", "Research", "Code"],
    contextWindow: "200K tokens",
    speed: "slow",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 30, topN: 10, temperature: 0.5, hybridSearch: true }
  },
  {
    id: "anthropic/claude-haiku-3-5",
    name: "Claude Haiku 3.5",
    provider: "Anthropic",
    description: "Fastest Claude model for quick, efficient responses",
    pricing: "low",
    pricingDetails: "$0.25 / 1M input tokens",
    capabilities: ["Text", "Classification", "Fast Responses"],
    contextWindow: "200K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 15, topN: 5, temperature: 0.7, hybridSearch: true }
  },

  // DeepSeek Models
  {
    id: "deepseek/deepseek-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    description: "Cost-effective model with strong reasoning and coding capabilities",
    pricing: "low",
    pricingDetails: "$0.27 / 1M input tokens",
    capabilities: ["Text", "Code", "Reasoning", "Math"],
    contextWindow: "128K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 20, topN: 6, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "deepseek/deepseek-coder",
    name: "DeepSeek Coder",
    provider: "DeepSeek",
    description: "Specialized for code generation and technical problem solving",
    pricing: "low",
    pricingDetails: "$0.14 / 1M input tokens",
    capabilities: ["Code", "Technical Writing", "Debugging"],
    contextWindow: "64K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 18, topN: 5, temperature: 0.6, hybridSearch: false }
  },

  // Cohere Models
  {
    id: "cohere/command-r-plus",
    name: "Command R+",
    provider: "Cohere",
    description: "Enterprise-grade model optimized for RAG and retrieval tasks",
    pricing: "medium",
    pricingDetails: "$2.50 / 1M input tokens",
    capabilities: ["Text", "RAG-optimized", "Multilingual", "Search"],
    contextWindow: "128K tokens",
    speed: "fast",
    recommended: true,
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 25, topN: 8, temperature: 0.6, hybridSearch: true }
  },
  {
    id: "cohere/command-r",
    name: "Command R",
    provider: "Cohere",
    description: "Balanced model for retrieval-augmented generation applications",
    pricing: "low",
    pricingDetails: "$0.50 / 1M input tokens",
    capabilities: ["Text", "RAG", "Multilingual"],
    contextWindow: "128K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 20, topN: 6, temperature: 0.7, hybridSearch: true }
  },

  // Mistral Models
  {
    id: "mistral/mistral-large-2",
    name: "Mistral Large 2",
    provider: "Mistral",
    description: "Flagship model with top-tier reasoning and multilingual support",
    pricing: "medium",
    pricingDetails: "$2.00 / 1M input tokens",
    capabilities: ["Text", "Code", "Multilingual", "Reasoning"],
    contextWindow: "128K tokens",
    speed: "medium",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 22, topN: 7, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "mistral/mistral-small",
    name: "Mistral Small",
    provider: "Mistral",
    description: "Fast and efficient model for everyday tasks",
    pricing: "low",
    pricingDetails: "$0.20 / 1M input tokens",
    capabilities: ["Text", "Classification", "Summarization"],
    contextWindow: "32K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 15, topN: 5, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "mistral/codestral",
    name: "Codestral",
    provider: "Mistral",
    description: "Specialized coding model for software development",
    pricing: "low",
    pricingDetails: "$0.30 / 1M input tokens",
    capabilities: ["Code", "Technical Writing", "Debugging"],
    contextWindow: "32K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 18, topN: 5, temperature: 0.6, hybridSearch: false }
  },

  // Hugging Face Models
  {
    id: "huggingface/llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "Hugging Face",
    description: "Open-source model with strong general capabilities",
    pricing: "low",
    pricingDetails: "$0.50 / 1M input tokens",
    capabilities: ["Text", "Code", "Open Source"],
    contextWindow: "128K tokens",
    speed: "medium",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 20, topN: 6, temperature: 0.7, hybridSearch: true }
  },
  {
    id: "huggingface/mixtral-8x7b",
    name: "Mixtral 8x7B",
    provider: "Hugging Face",
    description: "Efficient mixture-of-experts model for diverse tasks",
    pricing: "low",
    pricingDetails: "$0.24 / 1M input tokens",
    capabilities: ["Text", "Multilingual", "Open Source"],
    contextWindow: "32K tokens",
    speed: "fast",
    supportedRegions: ["global"],
    requiresAuth: true,
    ragSettings: { topK: 18, topN: 6, temperature: 0.7, hybridSearch: true }
  }
];

// Provider logos mapping
const providerLogos: Record<string, string> = {
  "Google": "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",
  "OpenAI": "https://cdn.openai.com/API/logo-assets/openai-avatar.svg",
  "Anthropic": "https://www.anthropic.com/_next/static/media/Claude_black_white.b9db2a28.svg",
  "DeepSeek": "https://avatars.githubusercontent.com/u/165278108?s=200&v=4",
  "Cohere": "https://cohere.com/favicon.ico",
  "Mistral": "https://mistral.ai/images/logo_hubc88c4ece131b91c7cb753f40e9e1cc5_2589_256x0_resize_q97_h2_lanczos_3.webp",
  "Hugging Face": "https://huggingface.co/front/assets/huggingface_logo.svg"
};

interface ModelMarketplaceProps {
  selectedModelId: string | null;
  onSelectModel: (model: ModelConfig) => void;
  agentId?: string;
  targetRegion?: string;
}

export function ModelMarketplace({ 
  selectedModelId, 
  onSelectModel,
  agentId,
  targetRegion = "northamerica-northeast1"
}: ModelMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [pricingFilter, setPricingFilter] = useState<string>("all");
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [connectingModelId, setConnectingModelId] = useState<string | null>(null);
  const { toast } = useToast();
  const { hasAccess, loading: rbacLoading } = useRBAC();

  const providers = ["all", ...Array.from(new Set(models.map(m => m.provider)))];

  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.capabilities.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesProvider = providerFilter === "all" || model.provider === providerFilter;
    const matchesPricing = pricingFilter === "all" || model.pricing === pricingFilter;
    const matchesRegion = !targetRegion || model.supportedRegions.includes(targetRegion) || model.supportedRegions.includes("global");

    return matchesSearch && matchesProvider && matchesPricing && matchesRegion;
  });

  const handleTestModel = async (model: ModelConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!hasAccess(['executive', 'engineer'])) {
      toast({
        title: "Access Denied",
        description: "You need executive or engineer role to test models",
        variant: "destructive",
      });
      return;
    }

    setTestingModelId(model.id);

    try {
      const { data, error } = await supabase.functions.invoke('models-test', {
        body: { 
          modelId: model.id,
          targetRegion 
        }
      });

      if (error) throw error;

      toast({
        title: "Test Successful",
        description: `${model.name} responded in ${data.latency}ms`,
      });
    } catch (error) {
      handleError(error, {
        component: 'ModelMarketplace',
        action: 'handleTestModel',
        fallbackMessage: 'Failed to test model. Please check your connection.'
      });
    } finally {
      setTestingModelId(null);
    }
  };

  const handleConnectModel = async (model: ModelConfig, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!hasAccess(['executive'])) {
      toast({
        title: "Access Denied",
        description: "Only executives can connect new models",
        variant: "destructive",
      });
      return;
    }

    if (!model.requiresAuth) {
      toast({
        title: "No Auth Required",
        description: `${model.name} is available via the managed AI gateway without additional setup`,
      });
      return;
    }

    setConnectingModelId(model.id);

    try {
      const { data, error } = await supabase.functions.invoke('integrations-connect', {
        body: {
          provider: model.provider.toLowerCase(),
          name: `${model.name} Integration`,
          category: 'ai-model',
          connect_method: 'apikey'
        }
      });

      if (error) throw error;

      toast({
        title: "Integration Created",
        description: `${model.name} is ready to use. Configure API credentials in Integrations.`,
      });
    } catch (error) {
      handleError(error, {
        component: 'ModelMarketplace',
        action: 'handleConnectModel',
        fallbackMessage: 'Failed to connect model'
      });
    } finally {
      setConnectingModelId(null);
    }
  };

  const handleSelectModel = async (model: ModelConfig) => {
    // Update parent state immediately for UI feedback
    onSelectModel(model);

    // Persist selection to database if agentId exists
    if (agentId) {
      try {
        const { error } = await supabase
          .from('agents')
          .update({ 
            config: { 
              model: model.id,
              ragSettings: model.ragSettings 
            }
          })
          .eq('id', agentId);

        if (error) throw error;

        toast({
          title: "Model Selected",
          description: `${model.name} configured for this agent`,
        });
      } catch (error) {
        handleError(error, {
          component: 'ModelMarketplace',
          action: 'handleUseModel',
          fallbackMessage: 'Failed to save model selection'
        });
      }
    } else {
      toast({
        title: "Model Selected",
        description: `${model.name} will be used for this agent`,
      });
    }
  };

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
      case "fast": return <Zap className="h-4 w-4 text-primary" aria-hidden="true" />;
      case "medium": return <TrendingUp className="h-4 w-4 text-accent" aria-hidden="true" />;
      case "slow": return <Brain className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
      default: return null;
    }
  };

  if (rbacLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h3 font-display mb-2 flex items-center gap-2">
          <Brain className="h-5 w-5 icon-default" aria-hidden="true" />
          Model Marketplace
        </h3>
        <p className="text-body text-muted-foreground">
          Choose the best LLM for your RAG system • Region: {targetRegion}
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search models"
          />
        </div>

        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger aria-label="Filter by provider">
            <SelectValue placeholder="All Providers" />
          </SelectTrigger>
          <SelectContent>
            {providers.map(provider => (
              <SelectItem key={provider} value={provider}>
                {provider === "all" ? "All Providers" : provider}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={pricingFilter} onValueChange={setPricingFilter}>
          <SelectTrigger aria-label="Filter by pricing">
            <SelectValue placeholder="All Pricing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pricing</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="low">Low Cost</SelectItem>
            <SelectItem value="medium">Medium Cost</SelectItem>
            <SelectItem value="high">Premium</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredModels.map(model => {
          const isSelected = selectedModelId === model.id;
          const isTesting = testingModelId === model.id;
          const isConnecting = connectingModelId === model.id;
          const isRegionCompliant = model.supportedRegions.includes(targetRegion) || model.supportedRegions.includes("global");
          
          return (
            <Card
              key={model.id}
              className={`cursor-pointer transition-smooth relative overflow-hidden card-m2m ${
                isSelected
                  ? "border-primary shadow-lg glow-gold bg-primary/5"
                  : "hover:border-secondary"
              }`}
              onClick={() => handleSelectModel(model)}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Select ${model.name} model`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectModel(model);
                }
              }}
            >
              {model.recommended && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge className="bg-gradient-to-r from-primary to-secondary text-primary-foreground border-0">
                    Recommended
                  </Badge>
                </div>
              )}
              
              {isSelected && (
                <div className="absolute top-2 left-2 z-10">
                  <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
              )}

              {!isRegionCompliant && (
                <div className="absolute top-2 left-2 z-10">
                  <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {providerLogos[model.provider] && (
                      <img 
                        src={providerLogos[model.provider]} 
                        alt={`${model.provider} logo`}
                        className="h-8 w-8 object-contain flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-display truncate">
                        {model.name}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {model.provider}
                      </CardDescription>
                    </div>
                  </div>
                  {getSpeedIcon(model.speed)}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                  {model.description}
                </p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1.5 min-h-[3rem]">
                  {model.capabilities.slice(0, 3).map(cap => (
                    <Badge
                      key={cap}
                      variant="outline"
                      className="text-xs bg-secondary/10 border-secondary/30"
                    >
                      {cap}
                    </Badge>
                  ))}
                  {model.capabilities.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{model.capabilities.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Region Compliance */}
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  <span className={isRegionCompliant ? "text-muted-foreground" : "text-destructive"}>
                    {isRegionCompliant ? "Region compliant" : "Region not supported"}
                  </span>
                </div>

                {/* Pricing & Context */}
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" aria-hidden="true" />
                      Pricing
                    </span>
                    <Badge className={getPricingColor(model.pricing)}>
                      {model.pricing}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {model.pricingDetails}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Context: <span className="font-semibold">{model.contextWindow}</span>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {isSelected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Selected
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectModel(model);
                      }}
                    >
                      Select
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleTestModel(model, e)}
                    disabled={isTesting || !isRegionCompliant}
                    aria-label={`Test ${model.name}`}
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>

                  {model.requiresAuth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleConnectModel(model, e)}
                      disabled={isConnecting}
                      aria-label={`Connect ${model.name}`}
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plug className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-12 empty-state">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No models match your filters</p>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your region ({targetRegion}) or clearing filters
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              setSearchQuery("");
              setProviderFilter("all");
              setPricingFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
