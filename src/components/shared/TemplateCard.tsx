import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Sparkles, Star, TrendingUp, Download } from 'lucide-react';
import type { TemplateCatalogItem } from '@/stores/templatesCatalogStore';

interface TemplateCardProps {
  template: TemplateCatalogItem;
  variant: 'marketplace' | 'builder-step';
  selected?: boolean;
  onPreview: (template: TemplateCatalogItem) => void;
  onUse: (template: TemplateCatalogItem) => void;
}

export function TemplateCard({ template, variant, selected = false, onPreview, onUse }: TemplateCardProps) {
  return (
    <Card 
      data-testid="template-card"
      className={`group transition-all hover:shadow-lg ${
        selected 
          ? 'ring-2 ring-primary shadow-primary/20' 
          : 'hover:border-primary/50'
      }`}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="font-medium">
                {template.industry}
              </Badge>
              {template.certified && (
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="h-3 w-3 mr-1" />
                  M2M Certified
                </Badge>
              )}
              {template.badges.map((badge) => (
                <Badge key={badge} variant="outline" className="text-xs">
                  {badge}
                </Badge>
              ))}
            </div>
            <CardTitle className="text-lg leading-tight">
              {template.title}
            </CardTitle>
          </div>
          <div className="text-3xl shrink-0">
            {template.icon}
          </div>
        </div>
        <CardDescription className="line-clamp-2 text-sm">
          {template.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Metrics Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {template.rating > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span className="font-medium">{template.rating.toFixed(1)}</span>
              </div>
            )}
            {template.runsCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Download className="h-4 w-4" />
                <span>{template.runsCount.toLocaleString()}</span>
              </div>
            )}
          </div>
          {template.roiPct > 0 && (
            <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
              <TrendingUp className="h-3 w-3 mr-1" />
              ROI: {template.roiPct}%
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreview(template)}
          className="flex-1"
          aria-label={`Preview ${template.title}`}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button
          size="sm"
          onClick={() => onUse(template)}
          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
          aria-label={`Use ${template.title}`}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Use
        </Button>
      </CardFooter>
    </Card>
  );
}
