import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StandardCard, StandardCardData } from '@/components/shared/StandardCard';
import { StandardizedTemplatePreviewModal } from '@/components/templates/StandardizedTemplatePreviewModal';
import { useTemplateUseHandler } from '@/components/templates/TemplateUseHandler';
import { loadAllTemplates, type ValidatedTemplate } from '@/lib/templates/unifiedTemplateService';

interface DigitalTwinTemplatesGridProps {
  searchQuery: string;
  industryFilter: string;
  departmentFilter: string;
  twinTypeFilter: string;
  difficultyFilter: string;
  showRecommended: boolean;
}

export function DigitalTwinTemplatesGrid({
  searchQuery,
  industryFilter,
  departmentFilter,
  twinTypeFilter,
  difficultyFilter,
  showRecommended,
}: DigitalTwinTemplatesGridProps) {
  const [templates, setTemplates] = useState<ValidatedTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { handleUseTemplate } = useTemplateUseHandler();

  console.log('[DigitalTwinTemplatesGrid] Using Unified Template Service');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await loadAllTemplates();
      setTemplates(loaded);
      console.log(`[Marketplace] Loaded ${loaded.length} templates from unified service`);
    } catch (err) {
      console.error('[Marketplace] Error loading templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply client-side filtering
  const filteredTemplates = templates.filter(template => {
    const config = template.default_config as any || {};
    
    // Get industries and departments (can be arrays or single values)
    const templateIndustries = Array.isArray(config.industries) 
      ? config.industries 
      : (template.industry ? [template.industry] : []);
    const templateDepartments = Array.isArray(config.departments) 
      ? config.departments 
      : (template.department ? [template.department] : []);
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        template.name,
        template.description,
        ...templateIndustries,
        ...templateDepartments,
        ...template.tags,
      ].join(' ').toLowerCase();

      if (!searchableText.includes(query)) return false;
    }

    // Industry filter
    if (industryFilter !== 'all') {
      const hasIndustry = templateIndustries.some(ind => 
        ind.toLowerCase() === industryFilter.toLowerCase()
      );
      if (!hasIndustry) return false;
    }

    // Department filter
    if (departmentFilter !== 'all') {
      const hasDepartment = templateDepartments.some(dept => 
        dept.toLowerCase() === departmentFilter.toLowerCase()
      );
      if (!hasDepartment) return false;
    }

    // Twin type filter
    if (twinTypeFilter !== 'all' && template.twin_type !== twinTypeFilter) {
      return false;
    }

    // Difficulty filter
    if (difficultyFilter !== 'all' && template.difficulty !== difficultyFilter) {
      return false;
    }

    // Recommended filter
    if (showRecommended && !template.certified) {
      return false;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    );
  }

  // Show error state
  if (error && templates.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-6xl">⚠️</div>
        <h3 className="text-xl font-semibold text-destructive">Error Loading Templates</h3>
        <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
        <Button onClick={loadTemplates} variant="outline">Retry</Button>
      </div>
    );
  }

  // Show empty state when filters produce no results
  if (filteredTemplates.length === 0 && templates.length > 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-6xl">🔍</div>
        <h3 className="text-xl font-semibold">No templates match your filters</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Try adjusting your search query or filters to see more templates.
        </p>
        <p className="text-sm text-muted-foreground">
          Total available: {templates.length} template{templates.length !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }

  // Show empty state when no templates exist
  if (templates.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-6xl">📋</div>
        <h3 className="text-xl font-semibold">No templates available</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Templates will appear here once they are added to the catalog.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template, index) => {
          const config = template.default_config as any || {};
          
          // Extract industries and departments (support both arrays and single values)
          const templateIndustries = Array.isArray(config.industries) 
            ? config.industries 
            : (template.industry ? [template.industry] : []);
          const templateDepartments = Array.isArray(config.departments) 
            ? config.departments 
            : (template.department ? [template.department] : []);
          
          // Extract KPI definitions from kpi_block
          const kpiDefinitions = Array.isArray(config.kpi_block) 
            ? config.kpi_block.map((kpi: any) => ({
                name: kpi.label || kpi.name || kpi.key || 'KPI'
              }))
            : [];

          const cardData: StandardCardData = {
            id: template.id,
            name: template.name,
            description: template.description,
            icon: template.icon,
            // Pass both single and array versions for backward compatibility
            industry: templateIndustries[0] || template.industry,
            department: templateDepartments[0] || template.department,
            industries: templateIndustries,
            departments: templateDepartments,
            twinType: template.twin_type,
            rating: template.rating,
            downloads: template.downloads,
            certified: template.certified,
            roi: template.roi_pct,
            kpiDefinitions: kpiDefinitions,
          };

          return (
            <StandardCard
              key={template.id}
              mode="template"
              data={cardData}
              onPreview={() => setSelectedTemplateId(template.id)}
              onUseTemplate={() => handleUseTemplate(template.id, 'marketplace')}
              animationDelay={index * 30}
            />
          );
        })}
      </div>

      <StandardizedTemplatePreviewModal
        templateId={selectedTemplateId}
        open={!!selectedTemplateId}
        onOpenChange={() => setSelectedTemplateId(null)}
        mode="marketplace"
        onUse={() => {
          if (selectedTemplateId) {
            handleUseTemplate(selectedTemplateId, 'marketplace');
            setSelectedTemplateId(null);
          }
        }}
      />
    </>
  );
}
