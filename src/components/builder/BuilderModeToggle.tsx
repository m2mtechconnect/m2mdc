/**
 * Builder Mode Toggle
 * Allows switching between Quick Edit and Architect modes
 */

import { useBuilderMode } from './BuilderModeContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wand2, Settings2 } from 'lucide-react';

export function BuilderModeToggle() {
  const { mode, setMode } = useBuilderMode();

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 w-full">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={mode === 'quick' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2 h-8 flex-1 justify-center"
            onClick={() => setMode('quick')}
          >
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Edit</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Simplified view for business users</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={mode === 'architect' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2 h-8 flex-1 justify-center"
            onClick={() => setMode('architect')}
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Architect</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Full technical configuration</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
