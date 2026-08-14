/**
 * ZoomControlsOverlay Component
 * UI overlay for 3D scene zoom controls
 */

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

export interface ZoomControlsOverlayProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset?: () => void;
  onFitToView?: () => void;
  zoomLevel?: number;
  disabled?: boolean;
  /**
   * Render inside a host-positioned rail instead of anchoring itself to the
   * canvas corner. Used by the consolidated canvas toolbar so zoom, camera and
   * quality controls occupy one protected column and can never overlap.
   */
  inline?: boolean;
}

export function ZoomControlsOverlay({
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToView,
  zoomLevel = 1,
  disabled = false,
  inline = false
}: ZoomControlsOverlayProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div 
        className={
          inline
            ? 'flex w-full flex-col items-stretch gap-1.5 pointer-events-auto'
            : 'absolute top-3 right-3 z-10 flex flex-col gap-1.5 pointer-events-auto animate-fade-in'
        }
        style={inline ? undefined : { animationDelay: '0.3s' }}
      >
        {/* Zoom level indicator */}
        <div className="bg-slate-900/85 backdrop-blur-sm border border-slate-700/60 rounded-md px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-lg">
          <span className="text-[11px] text-slate-400 leading-none">Zoom</span>
          <span className="text-sm font-semibold text-slate-100 tabular-nums">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>

        {/* Control buttons */}
        <div className={`bg-slate-900/85 backdrop-blur-sm border border-slate-700/60 rounded-md p-1 flex gap-1 shadow-lg ${inline ? 'flex-row justify-end' : 'flex-col'}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all duration-150 hover:scale-105 active:scale-95"
                onClick={onZoomIn}
                disabled={disabled || zoomLevel >= 2.5}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Zoom In
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all duration-150 hover:scale-105 active:scale-95"
                onClick={onZoomOut}
                disabled={disabled || zoomLevel <= 0.4}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Zoom Out
            </TooltipContent>
          </Tooltip>

          {onReset && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all duration-150 hover:scale-105 active:scale-95"
                  onClick={onReset}
                  disabled={disabled}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                Reset View
              </TooltipContent>
            </Tooltip>
          )}

          {onFitToView && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all duration-150 hover:scale-105 active:scale-95"
                  onClick={onFitToView}
                  disabled={disabled}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                Fit to View
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Keyboard hint */}
        <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-700/40 rounded px-2 py-1 text-[10px] text-slate-500 text-center">
          Scroll to zoom
        </div>
      </div>
    </TooltipProvider>
  );
}
