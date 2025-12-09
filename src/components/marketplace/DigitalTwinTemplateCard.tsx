import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Download, TrendingUp, Eye } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DigitalTwinTemplateCardProps {
  template: any;
  onPreview: (template: any) => void;
  animationDelay?: number;
}

export function DigitalTwinTemplateCard({ 
  template, 
  onPreview,
  animationDelay = 0 
}: DigitalTwinTemplateCardProps) {
  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden border-border/50 animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="p-6 space-y-4">
        {/* Icon & Badges */}
        <div className="flex items-start justify-between">
          <div className="text-4xl">{template.hero_icon || '🤖'}</div>
          <div className="flex gap-1">
            {template.certified && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="default" className="text-xs">
                      ✓ Certified
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enterprise-verified template with guaranteed quality and support</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">{template.name}</h3>
          <div className="flex gap-2 mb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    {template.industry}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Industry classification</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {(template as any).department && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      {(template as any).department}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Department focus</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {(template as any).twin_type && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs">
                      {(template as any).twin_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Digital Twin type classification</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.description || 'Digital Twin template with AI-powered automation'}
          </p>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{template.rating || 4.5}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Average user rating</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {template.roi_pct && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{template.roi_pct}% ROI</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Estimated return on investment based on typical deployments</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {template.downloads && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    <span>{template.downloads}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Number of deployments</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* KPIs Improved */}
        {template.kpi_definitions && template.kpi_definitions.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mb-2">KPIs Improved:</p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Key Performance Indicators this template optimizes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex flex-wrap gap-1">
              {template.kpi_definitions.slice(0, 3).map((kpi: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {kpi.name || kpi}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onPreview(template)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View full template details, simulate workflows, and chat with the Digital Twin</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onPreview(template)}
                >
                  Use Template
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Deploy this template to your workspace and configure it in the Builder</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
}
