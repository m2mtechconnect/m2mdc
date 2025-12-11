/**
 * Simulation Mode Header
 * Clear visual indicator that user is in SIMULATION mode, not Blueprint Designer
 * All UX content sourced from centralized UX_STRINGS
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle, 
  Eye, 
  ExternalLink,
  Activity,
  Info,
  Clock,
  GitBranch
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { sanitizeTwinName } from '@/lib/utils/extractCompanyIdentity';
import { SIMULATION } from '@/ux';

interface SimulationModeHeaderProps {
  twinName?: string;
  twinId?: string;
  subtitle?: string;
  blueprintVersion?: string;
  lastUpdated?: string;
  showDesignerLink?: boolean;
  onViewSnapshot?: () => void;
}

export function SimulationModeHeader({ 
  twinName = 'Data Centre Twin',
  twinId = 'default',
  subtitle,
  blueprintVersion = 'v1.0',
  lastUpdated,
  showDesignerLink = true,
  onViewSnapshot
}: SimulationModeHeaderProps) {
  const navigate = useNavigate();
  const safeTwinName = sanitizeTwinName(twinName);

  const handleOpenDesigner = () => {
    navigate(`/blueprint/${twinId}`);
  };

  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 mb-6">
      {/* Animated background effect for simulation */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse" />
      
      <div className="relative p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Title and badges */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20 animate-pulse">
                <PlayCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{SIMULATION.TITLE}</h1>
                <p className="text-sm text-muted-foreground">{safeTwinName}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Simulation Mode Badge - Primary indicator */}
              <Badge className="bg-primary text-primary-foreground gap-1 px-3 py-1">
                <Activity className="h-3.5 w-3.5" />
                Simulation Mode
              </Badge>
              
              {/* Design Snapshot indicator */}
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" />
                {SIMULATION.SNAPSHOT.BADGE}
              </Badge>
              
              {/* Info tooltip */}
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    {SIMULATION.SNAPSHOT.TOOLTIP}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
            )}
          </div>
          
          {/* Center: Snapshot Info */}
          <div className="rounded-lg bg-muted/50 px-4 py-3 border border-border hidden md:block">
            <p className="text-xs text-muted-foreground mb-1">Design Snapshot</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono font-medium">{blueprintVersion}</span>
              </div>
              {lastUpdated && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{lastUpdated}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex gap-2">
            {onViewSnapshot && (
              <Button 
                variant="outline" 
                onClick={onViewSnapshot}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                View Design Snapshot
              </Button>
            )}
            
            {showDesignerLink && (
              <Button 
                variant="outline" 
                onClick={handleOpenDesigner}
                className="gap-2 shrink-0 border-primary/30 hover:bg-primary/10"
              >
                <ExternalLink className="h-4 w-4" />
                Open Blueprint Designer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
