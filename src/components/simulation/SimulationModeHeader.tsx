/**
 * Simulation Mode Header
 * Clear visual indicator that user is in SIMULATION mode, not Blueprint Designer
 * Shows simulation badge, read-only status, and link to Designer
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle, 
  Lock, 
  ExternalLink,
  Activity,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SimulationModeHeaderProps {
  twinName?: string;
  twinId?: string;
  subtitle?: string;
  showDesignerLink?: boolean;
}

export function SimulationModeHeader({ 
  twinName = 'Data Centre Twin',
  twinId = 'default',
  subtitle,
  showDesignerLink = true
}: SimulationModeHeaderProps) {
  const navigate = useNavigate();

  const handleOpenDesigner = () => {
    navigate(`/blueprint/${twinId}`);
  };

  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 mb-6">
      {/* Animated background effect for simulation */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse" />
      
      <div className="relative p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: Title and badges */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20 animate-pulse">
                <PlayCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Run Simulation</h1>
                <p className="text-sm text-muted-foreground">{twinName}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Simulation Mode Badge - Primary indicator */}
              <Badge className="bg-primary text-primary-foreground gap-1 px-3 py-1">
                <Activity className="h-3.5 w-3.5" />
                Simulation Mode
              </Badge>
              
              {/* Read-only indicator */}
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Read-Only Blueprint
              </Badge>
              
              {/* Info tooltip */}
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Simulation Mode</strong> runs scenarios against a frozen blueprint snapshot. 
                    Configuration changes must be made in the Blueprint Designer.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
            )}
          </div>
          
          {/* Right: Designer link */}
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
  );
}
