/**
 * Builder Mode Toggle
 * Allows switching between Quick Edit and Architect modes.
 *
 * On phone-width Builder headers the full two-button control competes with
 * the five-step progress control for horizontal space. Use one compact toggle
 * button below `sm`; the explicit two-option control remains available from
 * `sm` upward.
 */

import { useBuilderMode } from './BuilderModeContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wand2, Settings2 } from 'lucide-react';

export function BuilderModeToggle() {
  const { mode, setMode } = useBuilderMode();
  const nextMode = mode === 'quick' ? 'architect' : 'quick';
  const CurrentModeIcon = mode === 'quick' ? Wand2 : Settings2;

  return (
    <>
      <div className="sm:hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setMode(nextMode)}
              aria-label={`Builder mode: ${mode === 'quick' ? 'Quick Edit' : 'Architect'}. Switch to ${nextMode === 'quick' ? 'Quick Edit' : 'Architect'}.`}
              title={`Switch to ${nextMode === 'quick' ? 'Quick Edit' : 'Architect'}`}
            >
              <CurrentModeIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Current mode: {mode === 'quick' ? 'Quick Edit' : 'Architect'}. Switch mode.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="hidden sm:flex items-center gap-1 rounded-lg border bg-muted/30 p-1 w-full overflow-hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={mode === 'quick' ? 'default' : 'ghost'}
              size="sm"
              className="gap-1 h-8 flex-1 justify-center text-xs"
              onClick={() => setMode('quick')}
            >
              <Wand2 className="h-4 w-4" />
              <span>Quick Edit</span>
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
              className="gap-1 h-8 flex-1 justify-center text-xs"
              onClick={() => setMode('architect')}
            >
              <Settings2 className="h-4 w-4" />
              <span>Architect</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Full technical configuration</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
