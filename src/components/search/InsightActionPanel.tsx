import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/hooks/useEdgeFunction";
import {
  Database, 
  ShieldCheck, 
  FileText, 
  MessageCircle, 
  Eye, 
  TrendingUp, 
  ClipboardCheck, 
  Code,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Classification {
  industry: string;
  department: string;
  contentType: string;
  dataSignals: string[];
  piiRisk: string;
  confidence: number;
  candidateUseCases: string[];
}

interface CTA {
  id: string;
  title: string;
  description: string;
  benefit: string;
  action: string;
  builderStep: number;
  icon: string;
  priority: number;
  payload: any;
}

interface InsightActionPanelProps {
  url: string;
  title: string;
  summary: string[];
  classification: Classification;
  ctas: CTA[];
  onApply: (cta: CTA) => void;
  pageId?: string;
  insightResult?: any;
}

const iconMap: Record<string, any> = {
  database: Database,
  'shield-check': ShieldCheck,
  'file-text': FileText,
  'message-circle': MessageCircle,
  eye: Eye,
  'trending-up': TrendingUp,
  'clipboard-check': ClipboardCheck,
  code: Code,
};

const getPiiRiskColor = (risk: string) => {
  switch (risk) {
    case 'HIGH': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
    case 'MEDIUM': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    default: return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30';
  }
};

export const InsightActionPanel = ({
  url,
  title,
  summary,
  classification,
  ctas,
  onApply,
  pageId,
  insightResult,
}: InsightActionPanelProps) => {
  const navigate = useNavigate();

  const handleSaveToLibrary = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Please sign in to save to library');
        console.error('[InsightActionPanel] Auth error:', userError);
        return;
      }

      const data = await invokeEdgeFunction('knowledge-index', {
        pageId: pageId || insightResult?.pageId,
        url,
        title,
        tags: [classification.industry, classification.department, classification.contentType],
        userId: user.id
      });
      
      if (data?.success) {
        toast.success('Saved to Knowledge Library', {
          description: 'Content indexed and ready for use'
        });
      } else {
        toast.error(data?.error || 'Failed to save');
      }
    } catch (error) {
      console.error('[InsightActionPanel] Save error:', error);
      toast.error('Failed to save to library');
    }
  };

  const handleApplyCTA = (cta: CTA) => {
    // Build prefill payload
    const prefillData = {
      capturedPageId: pageId || insightResult?.pageId,
      action: cta.id,
      templateId: cta.payload?.templateId,
      department: classification.department,
      industry: classification.industry,
      contentType: classification.contentType,
      connectors: cta.payload?.connectors || {},
      workflowNodes: cta.payload?.workflowNodes || []
    };

    // Navigate to builder with prefill state
    navigate('/builder', { 
      state: { 
        prefill: prefillData,
        step: cta.builderStep || 1 
      } 
    });

    toast.success(`Applying "${cta.title}"`, {
      description: 'Builder will prefill with relevant data'
    });

    // Call the original handler if provided
    if (onApply) {
      onApply(cta);
    }
  };

  const handleCreateAudit = () => {
    navigate('/compliance', { state: { url, title } });
  };

  const handleAddMonitoring = () => {
    toast.success('Monitoring job created');
    console.log('Creating monitoring job for:', url);
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Overview Card */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-start gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <span className="line-clamp-2">{title}</span>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <ExternalLink className="h-3 w-3" />
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary truncate"
                >
                  {url}
                </a>
              </CardDescription>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {classification.industry}
            </Badge>
            <Badge variant="outline" className="bg-secondary/10 text-secondary-foreground border-secondary/20">
              {classification.department}
            </Badge>
            <Badge variant="outline">
              {classification.contentType}
            </Badge>
            <Badge variant="outline" className={getPiiRiskColor(classification.piiRisk)}>
              {classification.piiRisk} PII Risk
            </Badge>
            <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/20">
              {Math.round(classification.confidence * 100)}% Confidence
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary */}
          <div>
            <h4 className="text-sm font-semibold mb-2">AI Overview</h4>
            <ul className="space-y-2">
              {summary.map((point, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSaveToLibrary}
            >
              Save to Knowledge Library
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCreateAudit}
            >
              Create Compliance Audit
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleAddMonitoring}
            >
              Add Monitoring
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CTA Cards */}
      {ctas.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Recommended Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ctas.map((cta) => {
              const Icon = iconMap[cta.icon] || Sparkles;
              
              return (
                <Card 
                  key={cta.id}
                  className="group hover:border-primary/50 transition-all duration-200 hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{cta.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {cta.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {cta.benefit}
                    </p>
                    <Button 
                      className="w-full glow-yellow"
                      onClick={() => handleApplyCTA(cta)}
                    >
                      Apply →
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
