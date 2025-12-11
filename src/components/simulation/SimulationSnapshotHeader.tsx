/**
 * Simulation Snapshot Header
 * Shows current simulation status with frozen design snapshot info
 * CLEAR visual distinction from Blueprint Designer
 */

import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle, ExternalLink, FileDown, Clock, 
  GitBranch, AlertCircle, CheckCircle2
} from 'lucide-react';

interface SimulationSnapshotHeaderProps {
  twinName?: string;
  twinId?: string;
  blueprintVersion?: string;
  lastUpdated?: string;
  scenarioName?: string;
  isRunning?: boolean;
  onDownloadSnapshot?: () => void;
}

export function SimulationSnapshotHeader({
  twinName = 'Sovereign AI Data Centre',
  twinId = 'default',
  blueprintVersion = 'v1.0',
  lastUpdated = new Date().toLocaleDateString(),
  scenarioName,
  isRunning = false,
  onDownloadSnapshot,
}: SimulationSnapshotHeaderProps) {
  const navigate = useNavigate();

  const handleOpenDesigner = () => {
    navigate(`/blueprint/${twinId}`);
  };

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Simulation Status */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/20 relative">
            <PlayCircle className="h-6 w-6 text-primary" />
            {isRunning && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-success rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold">Simulation Environment</h2>
              <Badge className="gap-1 bg-primary/90">
                <PlayCircle className="h-3 w-3" />
                Simulation Mode
              </Badge>
              {isRunning ? (
                <Badge variant="default" className="gap-1 bg-success">
                  <CheckCircle2 className="h-3 w-3" />
                  Running
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Ready
                </Badge>
              )}
            </div>
            {scenarioName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Scenario: <span className="font-medium">{scenarioName}</span>
              </p>
            )}
          </div>
        </div>
        
        {/* Center: Design Snapshot Info */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Using Design Snapshot</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono font-medium">{blueprintVersion}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{lastUpdated}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
            {twinName}
          </p>
        </div>
        
        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={onDownloadSnapshot}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Download Snapshot
          </Button>
          <Button 
            variant="outline"
            onClick={handleOpenDesigner}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Blueprint Designer
          </Button>
        </div>
      </div>
    </div>
  );
}
