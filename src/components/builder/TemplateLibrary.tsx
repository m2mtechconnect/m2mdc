import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  default_config: any;
  recommended_models: string[];
  sample_prompts: string[];
  kpi_definitions: any[];
}

interface TemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateLibrary({ open, onOpenChange }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('templates-list');
      if (error) throw error;

      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: "Error loading templates",
        description: "Failed to fetch available templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template: Template) => {
    navigate(`/builder?template=${template.id}`);
    onOpenChange(false);
    
    toast({
      title: "Template selected",
      description: `Starting with ${template.name}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Choose a Template
          </DialogTitle>
          <DialogDescription>
            Start with a pre-configured AI agent template optimized for your use case
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="p-4 cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                onClick={() => selectTemplate(template)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-3xl">{template.icon}</div>
                    <div>
                      <h4 className="text-h5 font-semibold">{template.name}</h4>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                </div>

                <p className="text-caption text-muted-foreground mb-4 line-clamp-2">
                  {template.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{template.kpi_definitions.length} KPIs tracked</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{template.sample_prompts.length} example prompts</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Pre-configured RAG pipeline</span>
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  Use Template
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}

        {!loading && templates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No templates available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
