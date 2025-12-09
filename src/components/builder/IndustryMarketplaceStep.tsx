import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalogStore } from '@/stores/catalogStore';
import { Button } from '@/components/ui/button';
import { StandardCard, StandardCardData } from '@/components/shared/StandardCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, X, Shield, Sparkles } from 'lucide-react';
import { IndustryAgentPreviewModal } from '../marketplace/IndustryAgentPreviewModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { startBuilderFromTemplate } from '@/lib/intake';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const INDUSTRIES = [
  'Marketing',
  'Finance',
  'Manufacturing',
  'Retail',
  'Energy',
  'Healthcare',
  'Human Resources',
  'Legal',
  'Education',
  'Real Estate'
];

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'llm', label: 'LLM' },
  { value: 'rag', label: 'RAG' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'automation', label: 'Automation' },
  { value: 'chatbot', label: 'Chatbot' },
  { value: 'predictive', label: 'Predictive AI' },
];

const SORT_OPTIONS = [
  { value: 'roi', label: 'Sort by ROI' },
  { value: 'rating', label: 'Sort by Rating' },
  { value: 'popularity', label: 'Sort by Popularity' },
];

interface IndustryMarketplaceStepProps {
  onSelectTemplate: (template: any) => void;
  department?: string;
}

export function IndustryMarketplaceStep({ onSelectTemplate, department }: IndustryMarketplaceStepProps) {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { industryTemplates, loadIndustryTemplates, isLoadingIndustry } = useCatalogStore();

  // Map departments to industries for recommendations
  const departmentToIndustries: Record<string, string[]> = {
    'Legal': ['Legal', 'Healthcare'],
    'Operations': ['Manufacturing', 'Energy', 'Retail'],
    'Finance': ['Finance', 'Real Estate'],
    'Marketing': ['Marketing', 'Retail'],
    'Human Resources': ['Human Resources', 'Education'],
    'Engineering': ['Manufacturing', 'Energy']
  };
  
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [roiRange, setRoiRange] = useState([0, 500]);
  const [sortBy, setSortBy] = useState('roi');
  const [isFiltering, setIsFiltering] = useState(false);
  const navigate = useNavigate();

  // Handle templateId from URL (deep link from marketplace)
  const prefillTemplateId = searchParams.get('templateId');

  // Initial load on mount
  useEffect(() => {
    loadIndustryTemplates();
  }, []);

  // Handle prefill from marketplace deep link
  useEffect(() => {
    if (prefillTemplateId && industryTemplates.length > 0) {
      const template = industryTemplates.find(t => t.id === prefillTemplateId);
      if (template) {
        handleUseTemplate(template);
      }
    }
  }, [prefillTemplateId, industryTemplates]);

  // Debounced load with filtering state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFiltering(true);
      loadIndustryTemplates({
        q: searchQuery,
        industry: selectedIndustries.length > 0 ? selectedIndustries.join(',') : undefined,
      }).finally(() => {
        setTimeout(() => setIsFiltering(false), 200);
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedIndustries, categoryFilter, certifiedOnly, roiRange]);

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries(prev =>
      prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedIndustries([]);
    setCategoryFilter('all');
    setCertifiedOnly(false);
    setRoiRange([0, 500]); // Match the new max
  };

  const hasActiveFilters = searchQuery || selectedIndustries.length > 0 || categoryFilter !== 'all' || certifiedOnly || roiRange[0] > 0 || roiRange[1] < 500;

  // Get recommended templates based on department
  const recommendedTemplates = useMemo(() => {
    if (!department || !industryTemplates.length) return [];
    
    const relevantIndustries = departmentToIndustries[department] || [];
    if (relevantIndustries.length === 0) return [];

    return industryTemplates
      .filter(t => relevantIndustries.includes(t.industry))
      .sort((a, b) => (b.roi_pct || 0) - (a.roi_pct || 0))
      .slice(0, 3); // Show top 3 recommendations
  }, [department, industryTemplates]);

  // Filter and sort templates client-side
  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = [...industryTemplates];

    // Apply category filter (skip for now since we don't have category field)
    // Category filtering will be added when backend supports it

    // Apply certification filter
    if (certifiedOnly) {
      filtered = filtered.filter(t => t.certified === true);
    }

    // Apply ROI range filter
    filtered = filtered.filter(t => {
      const roi = t.roi_pct || 0;
      return roi >= roiRange[0] && roi <= roiRange[1];
    });

    // Sort
    switch (sortBy) {
      case 'roi':
        return filtered.sort((a, b) => (b.roi_pct || 0) - (a.roi_pct || 0));
      case 'rating':
        return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'popularity':
        return filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
      default:
        return filtered;
    }
  }, [industryTemplates, categoryFilter, certifiedOnly, roiRange, sortBy]);

  const handleUseTemplate = async (template: any) => {
    // Determine source entry based on context
    const sourceEntry = prefillTemplateId ? 'marketplace' : 'builder';
    
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
    const result = await startBuilderFromTemplate(
      template.id,
      user.id,
      sourceEntry
    );

    if (result.success) {
      navigate(result.builderUrl);
      onSelectTemplate(template);
    } else {
      toast({ 
        title: "Error", 
        description: result.error || 'Failed to load template',
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Recommended Templates Section */}
      {recommendedTemplates.length > 0 && (
        <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-2 border-primary/20 rounded-xl p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Recommended for {department}
            </h3>
            <Badge variant="secondary" className="ml-2">
              Based on your selection
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            These industry solutions are optimized for {department} department workflows
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedTemplates.map((template, index) => {
              const cardData: StandardCardData = {
                id: template.id,
                name: template.name,
                description: template.description || '',
                icon: '🤖',
                industry: template.industry,
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
                  onUseTemplate={() => handleUseTemplate(template)}
                  animationDelay={index * 30}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search agents by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 transition-smooth hover:scale-105 active:scale-95">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Certified Toggle */}
          <div className="flex items-center space-x-2 px-3 py-2 border rounded-md transition-smooth hover:scale-105 active:scale-95">
            <Switch
              id="certified"
              checked={certifiedOnly}
              onCheckedChange={setCertifiedOnly}
            />
            <Label htmlFor="certified" className="cursor-pointer text-sm flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Certified Only
            </Label>
          </div>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 transition-smooth hover:scale-105 active:scale-95">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* ROI Range Slider */}
          <div className="flex items-center gap-3 px-4 py-2 border rounded-md min-w-64">
            <Label className="text-sm whitespace-nowrap">ROI:</Label>
            <Slider
              value={roiRange}
              onValueChange={setRoiRange}
              min={0}
              max={500}
              step={10}
              className="flex-1"
            />
            <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
              {roiRange[0]}%-{roiRange[1]}%
            </span>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto transition-smooth hover:scale-105"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Industry Chips */}
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map(industry => (
            <Badge
              key={industry}
              variant={selectedIndustries.includes(industry) ? 'default' : 'outline'}
              className="cursor-pointer transition-smooth hover:scale-105 active:scale-95"
              onClick={() => toggleIndustry(industry)}
            >
              {industry}
              {selectedIndustries.includes(industry) && (
                <X className="ml-1 h-3 w-3" />
              )}
            </Badge>
          ))}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 animate-fade-in">
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
            {categoryFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Category: {CATEGORIES.find(c => c.value === categoryFilter)?.label}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryFilter('all')} />
              </Badge>
            )}
            {certifiedOnly && (
              <Badge variant="secondary" className="gap-1">
                Certified Only
                <X className="h-3 w-3 cursor-pointer" onClick={() => setCertifiedOnly(false)} />
              </Badge>
            )}
            {(roiRange[0] > 0 || roiRange[1] < 500) && (
              <Badge variant="secondary" className="gap-1">
                ROI: {roiRange[0]}%-{roiRange[1]}%
                <X className="h-3 w-3 cursor-pointer" onClick={() => setRoiRange([0, 500])} />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Agent Grid */}
      {(isLoadingIndustry || isFiltering) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : filteredAndSortedTemplates.length === 0 ? (
        <div className="text-center py-12 animate-fade-in">
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters
              ? `No ${certifiedOnly ? 'certified ' : ''}${
                  categoryFilter !== 'all' ? CATEGORIES.find(c => c.value === categoryFilter)?.label.toLowerCase() + ' ' : ''
                }${
                  selectedIndustries.length > 0 ? selectedIndustries.join(', ') + ' ' : ''
                }agents found`
              : 'No agents available'}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {filteredAndSortedTemplates.map((template, index) => {
            const cardData: StandardCardData = {
              id: template.id,
              name: template.name,
              description: template.description || '',
              icon: '🤖',
              industry: template.industry,
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
                onUseTemplate={() => handleUseTemplate(template)}
                animationDelay={index * 30}
              />
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <IndustryAgentPreviewModal
        agent={selectedTemplate}
        open={!!selectedTemplate}
        onOpenChange={() => setSelectedTemplate(null)}
        onConnect={(agentId) => {
          const template = filteredAndSortedTemplates.find(t => t.id === agentId);
          if (template) handleUseTemplate(template);
        }}
      />
    </div>
  );
}
