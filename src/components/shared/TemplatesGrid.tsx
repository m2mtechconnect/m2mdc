import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogStore } from '@/stores/catalogStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { telemetry } from '@/lib/telemetry';
import { Skeleton } from '@/components/ui/skeleton';
import { startBuilderFromTemplate } from '@/lib/intake';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Rocket, Star, TrendingUp, Download, Award } from 'lucide-react';

interface TemplatesGridProps {
  mode: 'marketplace' | 'builder';
  systemId?: string;
  onSelect?: (template: any) => void;
  searchQuery?: string;
}

export function TemplatesGrid({ mode, systemId, onSelect, searchQuery: externalSearch = '' }: TemplatesGridProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { m2mTemplates, loadM2MTemplates, isLoadingM2M } = useCatalogStore();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
 
  useEffect(() => {
    loadM2MTemplates({ q: externalSearch });
  }, [externalSearch, loadM2MTemplates]);

  const handleUse = async (template: any) => {
    telemetry.track('template_deploy_click', { templateId: template.id });
    
    if (mode === 'builder' && onSelect) {
      onSelect(template);
      setSelectedTemplateId(template.id);
      toast({ title: 'Template selected', description: `Using ${template.name}` });
      return;
    }
 
    if (mode === 'marketplace') {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast({ 
          title: "Error", 
          description: "Please sign in to continue",
          variant: "destructive"
        });
        return;
      }

      // Use unified intake service
      try {
        const result = await startBuilderFromTemplate(
          template.id,
          user.id,
          'marketplace'
        );

        if (result.success) {
          navigate(result.builderUrl);
        } else {
          toast({ 
            title: 'Error', 
            description: result.error || 'Failed to load template',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Failed to open builder with template:', error);
        toast({ 
          title: 'Error', 
          description: 'Failed to open Builder with template',
          variant: 'destructive'
        });
      }
    }
  };

  if (isLoadingM2M) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {m2mTemplates.map((template) => (
        <Card key={template.id} className={`p-6 hover:shadow-lg transition-all ${selectedTemplateId === template.id ? 'ring-2 ring-primary' : ''}`}>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              {template.industry && <Badge variant="secondary">{template.industry}</Badge>}
              {template.certified && (
                <Badge className="bg-yellow-500/10 text-yellow-700">
                  <Award className="h-3 w-3 mr-1" />
                  Certified
                </Badge>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {template.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  <span>{template.rating}</span>
                </div>
              )}
              {template.roi_pct && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span>{template.roi_pct}%</span>
                </div>
              )}
              {template.downloads && (
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  <span>{template.downloads}</span>
                </div>
              )}
            </div>

            <Button
              size="sm"
              className="w-full"
              onClick={() => handleUse(template)}
            >
              <Rocket className="h-4 w-4 mr-2" />
              {mode === 'builder' ? 'Use Template' : 'Use in Builder'}
            </Button>
          </div>
        </Card>
      ))}

      {m2mTemplates.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          No templates found
        </div>
      )}
    </div>
  );
}