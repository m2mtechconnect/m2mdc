import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Download, TrendingUp, Eye, Play, Settings, Trash2, Activity, Clock, Shield, Beaker, FileText } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type StandardCardMode = 'template' | 'system';

export interface StandardCardData {
  id: string;
  name: string;
  description: string;
  icon?: string;
  
  // Support both single and multiple industries/departments
  industry?: string;
  department?: string;
  industries?: string[];
  departments?: string[];
  twinType?: string;
  
  // Template-specific
  rating?: number;
  downloads?: number;
  certified?: boolean;
  kpiDefinitions?: Array<{ name: string } | string>;
  
  // System-specific
  status?: string;
  grounding?: boolean;
  totalRuns?: number;
  successRate?: number;
  lastActivity?: string;
  version?: string;
  
  // Shared
  roi?: number;
  tags?: string[];
}

interface StandardCardProps {
  mode: StandardCardMode;
  data: StandardCardData;
  onPreview?: () => void;
  onUseTemplate?: () => void;
  onRun?: () => void;
  onManage?: () => void;
  onDelete?: () => void;
  onTestScenario?: () => void;
  onViewBlueprint?: () => void;
  animationDelay?: number;
  showActions?: boolean;
}

export function StandardCard({ 
  mode,
  data,
  onPreview,
  onUseTemplate,
  onRun,
  onManage,
  onDelete,
  onTestScenario,
  onViewBlueprint,
  animationDelay = 0,
  showActions = true,
}: StandardCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'deployed':
        return 'bg-success/10 text-success border-success/20';
      case 'draft':
        return 'bg-muted/50 text-muted-foreground border-border';
      case 'archived':
        return 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden border-border/50 animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="p-6 space-y-4">
        {/* Icon & Top Badges */}
        <div className="flex items-start justify-between">
          <div className="text-4xl">{data.icon || '🤖'}</div>
          <div className="flex gap-1">
            {mode === 'template' && data.certified && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                      ✓ Certified
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reviewed and certified by M2M's AI team</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {mode === 'system' && data.status && (
              <Badge className={getStatusColor(data.status)} variant="outline">
                {data.status}
              </Badge>
            )}
            {mode === 'system' && data.grounding && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Grounded with verified data sources</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Title & Category Badges */}
        <div>
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">{data.name}</h3>
          <div className="flex gap-2 mb-2 flex-wrap">
            {/* Render multiple industries if provided, otherwise fallback to single industry */}
            {data.industries && data.industries.length > 0 ? (
              data.industries.slice(0, 3).map((industry, idx) => (
                <TooltipProvider key={`industry-${idx}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs">
                        {industry}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Industry: {industry}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))
            ) : data.industry ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      {data.industry}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Primary industry</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            
            {/* Render multiple departments if provided, otherwise fallback to single department */}
            {data.departments && data.departments.length > 0 ? (
              data.departments.slice(0, 2).map((department, idx) => (
                <TooltipProvider key={`dept-${idx}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs">
                        {department}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Department: {department}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))
            ) : data.department ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      {data.department}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Department focus</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            
            {/* Show "+N more" indicator for additional industries/departments */}
            {(data.industries && data.industries.length > 3) || (data.departments && data.departments.length > 2) ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs">
                      +{Math.max(
                        (data.industries?.length || 0) - 3,
                        (data.departments?.length || 0) - 2
                      )} more
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {data.industries && data.industries.length > 3 && (
                        <p className="text-xs">Additional industries: {data.industries.slice(3).join(', ')}</p>
                      )}
                      {data.departments && data.departments.length > 2 && (
                        <p className="text-xs">Additional departments: {data.departments.slice(2).join(', ')}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}

            {data.twinType && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs">
                      {data.twinType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Twin type classification</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {data.description || 'AI-powered automation system'}
          </p>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {mode === 'template' && (
            <>
              {data.rating !== undefined && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{data.rating}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Average customer rating for this blueprint</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {data.roi !== undefined && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{data.roi}% ROI</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Estimated ROI over 12 months based on similar deployments</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {data.downloads !== undefined && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        <span>{data.downloads}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of deployments</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          )}
          
          {mode === 'system' && (
            <>
              {data.totalRuns !== undefined && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <span>{data.totalRuns} runs</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total executions</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {data.successRate !== undefined && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{Math.round(data.successRate)}%</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Success rate</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {data.lastActivity && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(data.lastActivity)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Last activity</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          )}
        </div>

        {/* KPIs Improved / Tags Section */}
        {mode === 'template' && data.kpiDefinitions && data.kpiDefinitions.length > 0 && (
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
              {data.kpiDefinitions.slice(0, 3).map((kpi, i) => {
                const kpiName = typeof kpi === 'string' ? kpi : kpi.name;
                return (
                  <TooltipProvider key={i}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs cursor-help">
                          {kpiName}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This template helps optimize {kpiName}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        )}

        {mode === 'system' && data.tags && data.tags.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex flex-wrap gap-1">
              {data.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            {mode === 'template' && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={onPreview}
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
                        className="flex-1 bg-[#FFD700] hover:bg-[#FFC700] text-black font-semibold"
                        onClick={onUseTemplate}
                      >
                        Use Template
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Deploy this template to your workspace and configure it in the Builder</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            {mode === 'system' && (
              <>
                <Button
                  size="sm"
                  onClick={onRun}
                  className="flex-1 h-8"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Run
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onManage}
                  className="flex-1 h-8"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Manage
                </Button>
                {onTestScenario && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={onTestScenario}
                          className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                        >
                          <Beaker className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Test Scenario</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {onViewBlueprint && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={onViewBlueprint}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View in Blueprint</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDelete}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
