import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogStore } from '@/stores/catalogStore';
import { Button } from '@/components/ui/button';
import { StandardCard, StandardCardData } from '@/components/shared/StandardCard';
import { IndustryAgentPreviewModal } from './IndustryAgentPreviewModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { trackEvent } from '@/lib/telemetry';
import { startBuilderFromTemplate } from '@/lib/intake';

interface IndustryAgentsTabProps {
  searchQuery: string;
}

export function IndustryAgentsTab({ searchQuery }: IndustryAgentsTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { industryTemplates, loadIndustryTemplates, isLoadingIndustry } = useCatalogStore();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [industryFilter, setIndustryFilter] = useState<string>('all');
 
  useEffect(() => {
    loadIndustryTemplates({ q: searchQuery, industry: industryFilter !== 'all' ? industryFilter : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, industryFilter]);

  const industries = Array.from(new Set(industryTemplates.map(t => t.industry)));
 
  const handleUseInBuilder = async (template: any) => {
    try {
      trackEvent('marketplace.select', {
        tab: 'industry',
        id: template.id,
        name: template.name,
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast({ title: "Error", description: "Please sign in to continue", variant: "destructive" });
        return;
      }

      const result = await startBuilderFromTemplate(template.id, user.id, 'marketplace');
      if (result.success) {
        navigate(result.builderUrl);
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to load template', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to use template in builder:', error);
      toast({ title: 'Error', description: 'Failed to apply template', variant: 'destructive' });
    }
  };

  if (isLoadingIndustry) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (industryTemplates.length === 0 && !isLoadingIndustry) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No industry templates found</p>
        <Button variant="outline" onClick={() => setIndustryFilter('all')}>
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Select value={industryFilter} onValueChange={setIndustryFilter}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Industry" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Industries</SelectItem>
          {industries.map(ind => (
            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {industryTemplates.map((template, index) => {
          const cardData: StandardCardData = {
            id: template.id,
            name: template.name,
            description: template.description || '',
            icon: '🤖',
            industry: template.industry,
            department: undefined,
            twinType: undefined,
            rating: 4.5,
            downloads: 100,
            certified: true,
            roi: 45,
          };

          return (
            <StandardCard
              key={template.id}
              mode="template"
              data={cardData}
              onPreview={() => setSelectedTemplate(template)}
              onUseTemplate={() => handleUseInBuilder(template)}
              animationDelay={index * 50}
            />
          );
        })}
      </div>

      <IndustryAgentPreviewModal
        agent={selectedTemplate}
        open={!!selectedTemplate}
        onOpenChange={() => setSelectedTemplate(null)}
        onConnect={handleUseInBuilder}
      />
    </div>
  );
}
