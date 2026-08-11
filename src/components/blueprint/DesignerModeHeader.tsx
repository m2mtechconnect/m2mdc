/**
 * Designer Mode Header
 * Clear visual indicator that user is in BLUEPRINT DESIGNER mode
 * Emphasizes editing capabilities and shows link to Simulation
 * POLISHED: Enhanced with animations and better visual hierarchy
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Edit3,
  Unlock,
  ExternalLink,
  Server,
  Info,
  Save,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildSimulationHandoffUrl, useSimulationPermissions } from '@/simulation/handoff';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DesignerModeHeaderProps {
  twinName?: string;
  twinId?: string;
  location?: string;
  showSimulationLink?: boolean;
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
  /** Route-authoritative blueprint id used for the Simulation handoff. */
  blueprintId?: string;
  /** Explicitly selected blueprint version / snapshot. */
  versionId?: string | number | null;
  /** Blueprint tab restored when the user presses Browser Back. */
  returnTab?: string;
}

export function DesignerModeHeader({ 
  twinName = 'Data Centre Twin',
  twinId = 'default',
  location,
  showSimulationLink = true,
  onSave,
  hasUnsavedChanges = false,
  blueprintId,
  versionId = null,
  returnTab,
}: DesignerModeHeaderProps) {
  const navigate = useNavigate();
  const { canViewSimulation, canConfigureSimulation } = useSimulationPermissions();
  const canHandOff = canViewSimulation && canConfigureSimulation;

  /**
   * Navigation ONLY. Blueprint must never create, queue or start a run, so
   * this handler performs no mutation and calls no simulation service.
   */
  const handleOpenInSimulation = () => {
    navigate(
      buildSimulationHandoffUrl({
        blueprintId: blueprintId ?? twinId,
        versionId,
        twinId: twinId !== blueprintId ? twinId : null,
        returnTab,
      }),
    );
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-success/30 bg-gradient-to-br from-success/5 via-background to-primary/5 mb-6 animate-fade-in">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-success/10 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-pulse-subtle" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-transparent via-success/5 to-transparent animate-shimmer" />
      </div>
      
      <div className="relative p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: Title and badges */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-success/20 to-success/10 border border-success/20 shadow-lg shadow-success/10">
                <Server className="h-6 w-6 text-success" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse border-2 border-background" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Blueprint Designer</h1>
                  <Sparkles className="h-4 w-4 text-success animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">{twinName}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Designer Mode Badge - Primary indicator */}
              <Badge variant="outline" className="gap-1.5 px-3 py-1 border-success/40 text-success bg-transparent hover:bg-success/5 transition-all duration-300">
                <Edit3 className="h-3.5 w-3.5" />
                Designer Mode
              </Badge>
              
              {/* Editable indicator */}
              <Badge variant="secondary" className="gap-1.5 hover:bg-secondary/80 transition-colors">
                <Unlock className="h-3 w-3" />
                Fully Editable
              </Badge>
              
              {/* Unsaved changes indicator */}
              {hasUnsavedChanges && (
                <Badge variant="outline" className="gap-1 text-warning border-warning bg-warning/10 animate-pulse">
                  Unsaved Changes
                </Badge>
              )}
              
              {/* Info tooltip */}
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Designer Mode</strong> allows full editing of the blueprint configuration.
                    Scenarios and runs are owned by the Simulation workspace: open this version there
                    to configure and execute a run.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {location && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {location}
              </p>
            )}
          </div>
          
          {/* Right: Actions */}
          <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {onSave && (
              <Button 
                onClick={onSave}
                disabled={!hasUnsavedChanges}
                className={cn(
                  "gap-2 transition-all duration-300",
                  hasUnsavedChanges && "shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                )}
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            )}
            
            {showSimulationLink && canHandOff && (
              <Button
                variant="outline"
                onClick={handleOpenInSimulation}
                data-testid="blueprint-open-in-simulation"
                className="gap-2 shrink-0 hover:bg-primary/5 hover:border-primary/50 hover:text-primary transition-all duration-300 group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
                Open in Simulation
              </Button>
            )}
            {showSimulationLink && !canHandOff && (
              <div
                className="flex max-w-xs items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
                data-testid="blueprint-simulation-access-required"
              >
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <p className="text-xs font-medium text-foreground">Simulation access required</p>
                  <p className="text-[11px] text-muted-foreground">
                    You can view this blueprint, but your role cannot configure or run simulations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
