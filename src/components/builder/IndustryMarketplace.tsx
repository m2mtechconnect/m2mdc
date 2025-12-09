import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCatalogStore } from "@/stores/catalogStore";
import { telemetry } from "@/lib/telemetry";
import { toast } from "sonner";
import { Search, Eye, Sparkles, Shield, Download, TrendingUp, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { startBuilderFromTemplate } from "@/lib/intake";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Energy",
  "Marketing",
  "Operations",
  "HR",
  "Legal",
  "Public Sector",
  "Agriculture",
];

interface IndustryMarketplaceProps {
  mode?: "full" | "embedded";
  onSelectTemplate?: (template: any) => void;
  onDeployTemplate?: (template: any) => void;
}

export default function IndustryMarketplace({ 
  mode = "full",
  onSelectTemplate,
  onDeployTemplate
}: IndustryMarketplaceProps) {
  const { industryTemplates, loadIndustryTemplates, isLoadingIndustry } = useCatalogStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadIndustryTemplates({ q: searchQuery });
  }, [searchQuery, loadIndustryTemplates]);

  const handleUseTemplate = async (template: any) => {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error("Please sign in to continue");
      return;
    }

    // Use unified intake service
    const result = await startBuilderFromTemplate(
      template.id,
      user.id,
      "marketplace"
    );

    if (result.success) {
      navigate(result.builderUrl);
      onSelectTemplate?.(template);
    } else {
      toast.error(result.error || 'Failed to load template');
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const filteredTemplates = useMemo(() => {
    return industryTemplates.filter(template => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(template.industry)) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return template.name.toLowerCase().includes(q) || template.industry.toLowerCase().includes(q);
      }
      return true;
    });
  }, [industryTemplates, selectedCategories, searchQuery]);

  if (isLoadingIndustry) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {mode === "full" && (
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <Badge
              key={cat}
              variant={selectedCategories.includes(cat) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="p-6 hover:shadow-lg transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <Badge variant="secondary">{template.industry}</Badge>
                {template.certified && (
                  <Badge className="bg-accent text-white"><Shield className="h-3 w-3 mr-1" />Certified</Badge>
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
                    <span>ROI: {template.roi_pct}%</span>
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
                onClick={() => handleUseTemplate(template)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No templates match your criteria. Try adjusting your filters.</p>
          <Button variant="outline" className="mt-4" onClick={() => {
            setSearchQuery('');
            setSelectedCategories([]);
          }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}