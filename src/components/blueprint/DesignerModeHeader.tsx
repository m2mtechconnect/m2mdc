/**
 * Designer Mode Header
 * Clean, non-distracting indicator that user is in BLUEPRINT DESIGNER mode
 * Badges are clearly labels, not buttons. Minimal visual noise.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Pencil, 
  PlayCircle,
  Save,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
    <div className="rounded-lg border border-border bg-card mb-6">
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: Title and status labels */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">Blueprint Designer</h1>
              {/* Status label — not a button */}
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success select-none pointer-events-none">
                <Pencil className="h-3 w-3" />
                Editing
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground truncate">
              {twinName}
              {location && <span className="ml-2 text-muted-foreground/70">· {location}</span>}
            </p>

            {hasUnsavedChanges && (
              <p className="text-xs text-warning mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
                Unsaved changes
              </p>
            )}
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {onSave && (
              <Button 
                size="sm"
                onClick={onSave}
                disabled={!hasUnsavedChanges}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
            )}
            
            {showSimulationLink && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleOpenSimulation}
                className="gap-1.5"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Run Simulation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
