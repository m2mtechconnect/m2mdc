import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useCatalogStore } from "@/stores/catalogStore";
import { loadAllTemplates, type DigitalTwinBlueprint } from "@/lib/templateLoader";
import { StandardFilters, StandardFiltersState } from "@/components/shared/StandardFilters";
import { StandardCard, StandardCardData } from "@/components/shared/StandardCard";
import { TemplateDetailDrawer } from "@/components/marketplace/TemplateDetailDrawer";

interface TemplateLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Remove hardcoded templates - will use real data from catalog

export function TemplateLibraryModal({ open, onOpenChange }: TemplateLibraryModalProps) {
  const [filters, setFilters] = useState<StandardFiltersState>({
    searchQuery: '',
    industryFilter: 'all',
    departmentFilter: 'all',
    typeFilter: 'all',
    levelFilter: 'all',
    showRecommended: false,
  });
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // VERIFICATION LOG
  console.log('[TemplateLibraryModal] v2 with JSON fallback');
  
  // Load templates from catalog store
  const {
    m2mTemplates, 
    industryTemplates, 
    loadM2MTemplates, 
    loadIndustryTemplates,
    isLoadingM2M,
    isLoadingIndustry 
  } = useCatalogStore();

  // Load templates on mount
  useEffect(() => {
    if (open) {
      loadM2MTemplates();
      loadIndustryTemplates();
    }
  }, [open, loadM2MTemplates, loadIndustryTemplates]);

  // Combine all templates from database
  const dbTemplates = [
    ...m2mTemplates.map(t => ({ ...t, templateType: 'm2m' as const })),
    ...industryTemplates.map(t => ({ ...t, templateType: 'industry' as const })),
  ];

  const hasDbTemplates = dbTemplates.length > 0;

  // Fallback: load JSON blueprints when database has no templates
  const jsonTemplates: any[] = !hasDbTemplates
    ? loadAllTemplates().map((t: DigitalTwinBlueprint) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        industry: t.industry,
        roi_pct: t.roi_hint,
        rating: t.rating,
        certified: t.certified,
        hero_icon: '🤖',
        blueprint: t.blueprint,
        kpi_definitions: t.blueprint.kpis,
        rag: t.rag,
        llm: t.llm,
        workflow: t.workflow,
        metrics_defaults: t.metrics_defaults,
        templateType: 'json' as const,
      }))
    : [];

  const allTemplates = hasDbTemplates ? dbTemplates : jsonTemplates;

  // Debug logging
  console.log('[TemplateLibraryModal] dbTemplates:', dbTemplates.length, 'jsonTemplates:', jsonTemplates.length);
  console.log('[TemplateLibraryModal] allTemplates:', allTemplates.length);

  // Get unique industries for filtering
  const industries = ['All', ...new Set(allTemplates.map(t => t.industry).filter(Boolean))];

  // Filter templates using standardized filters
  const filteredTemplates = allTemplates.filter((template) => {
    const matchesSearch =
      filters.searchQuery === "" ||
      template.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(filters.searchQuery.toLowerCase()));

    const matchesIndustry =
      filters.industryFilter === "all" || template.industry === filters.industryFilter;

    const matchesDepartment =
      filters.departmentFilter === "all" || (template as any).department === filters.departmentFilter;

    return matchesSearch && matchesIndustry && matchesDepartment;
  });


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-h3 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Template Library
          </DialogTitle>
          <DialogDescription>
            Browse ready-made Digital Twin & Agent blueprints by industry and department
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Standardized Filters */}
          <StandardFilters
            mode="template"
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={() => setFilters({
              searchQuery: '',
              industryFilter: 'all',
              departmentFilter: 'all',
              typeFilter: 'all',
              levelFilter: 'all',
              showRecommended: false,
            })}
            disabled={isLoadingM2M || isLoadingIndustry}
          />

          {/* Loading State */}
          {(isLoadingM2M || isLoadingIndustry) && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Templates Grid */}
          {!isLoadingM2M && !isLoadingIndustry && filteredTemplates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template, index) => {
                const cardData: StandardCardData = {
                  id: template.id,
                  name: template.name,
                  description: template.description || 'Digital Twin template with AI-powered automation',
                  icon: template.hero_icon || '🤖',
                  industry: template.industry,
                  department: (template as any).department,
                  twinType: (template as any).twin_type,
                  rating: template.rating || 4.5,
                  downloads: template.downloads,
                  certified: template.certified,
                  roi: template.roi_pct,
                  kpiDefinitions: template.kpi_definitions || [],
                };

                return (
                  <StandardCard
                    key={template.id}
                    mode="template"
                    data={cardData}
                    onPreview={() => setSelectedTemplate(template)}
                    onUseTemplate={() => setSelectedTemplate(template)}
                    animationDelay={index * 30}
                  />
                );
              })}
            </div>
          )}


          {/* Empty State */}
          {!isLoadingM2M && !isLoadingIndustry && filteredTemplates.length === 0 && allTemplates.length > 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-body text-muted-foreground mb-2">No templates found</p>
              <p className="text-caption text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
              <Button 
                variant="outline" 
                onClick={() => setFilters({
                  searchQuery: '',
                  industryFilter: 'all',
                  departmentFilter: 'all',
                  typeFilter: 'all',
                  levelFilter: 'all',
                  showRecommended: false,
                })}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* No Templates at All */}
          {!isLoadingM2M && !isLoadingIndustry && allTemplates.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-body text-muted-foreground mb-2">No templates available</p>
              <p className="text-caption text-muted-foreground">
                Templates will appear here once they are added to the system
              </p>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Use the same rich preview drawer as the Marketplace */}
      <TemplateDetailDrawer
        template={selectedTemplate}
        open={!!selectedTemplate}
        onOpenChange={() => setSelectedTemplate(null)}
      />
    </Dialog>
  );
}
