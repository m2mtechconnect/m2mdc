/**
 * Designer Mode Header
 * Clear visual indicator that user is in BLUEPRINT DESIGNER mode
 * Emphasizes editing capabilities and shows link to Simulation
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Edit3, 
  Unlock, 
  PlayCircle,
  Server,
  Info,
  Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DesignerModeHeaderProps {
  twinName?: string;
  twinId?: string;
  location?: string;
  showSimulationLink?: boolean;
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
}

export function DesignerModeHeader({ 
  twinName = 'Data Centre Twin',
  twinId = 'default',
  location,
  showSimulationLink = true,
  onSave,
  hasUnsavedChanges = false
}: DesignerModeHeaderProps) {
  const navigate = useNavigate();

  const handleOpenSimulation = () => {
    navigate(`/data-centre-twin?tab=simulation`);
  };

  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-success/30 bg-gradient-to-r from-success/5 via-success/10 to-success/5 mb-6">
      <div className="relative p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: Title and badges */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-success/20">
                <Server className="h-6 w-6 text-success" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Blueprint Designer</h1>
                <p className="text-sm text-muted-foreground">{twinName}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Designer Mode Badge - Primary indicator */}
              <Badge className="bg-success text-success-foreground gap-1 px-3 py-1">
                <Edit3 className="h-3.5 w-3.5" />
                Designer Mode
              </Badge>
              
              {/* Editable indicator */}
              <Badge variant="secondary" className="gap-1">
                <Unlock className="h-3 w-3" />
                Fully Editable
              </Badge>
              
              {/* Unsaved changes indicator */}
              {hasUnsavedChanges && (
                <Badge variant="outline" className="gap-1 text-warning border-warning">
                  Unsaved Changes
                </Badge>
              )}
              
              {/* Info tooltip */}
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Designer Mode</strong> allows full editing of the blueprint configuration. 
                    Changes here affect future simulations. Run simulations to test changes.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {location && (
              <p className="text-sm text-muted-foreground mt-2">{location}</p>
            )}
          </div>
          
          {/* Right: Actions */}
          <div className="flex gap-2">
            {onSave && (
              <Button 
                onClick={onSave}
                disabled={!hasUnsavedChanges}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            )}
            
            {showSimulationLink && (
              <Button 
                variant="outline" 
                onClick={handleOpenSimulation}
                className="gap-2 shrink-0"
              >
                <PlayCircle className="h-4 w-4" />
                Run Simulation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
