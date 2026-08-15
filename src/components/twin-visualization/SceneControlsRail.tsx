/**
 * Compact scene-control rail.
 *
 * The canvas right edge carries only what an operator needs continuously:
 * zoom readout, zoom in/out, reset and a single Scene controls trigger. Every
 * other view setting lives inside a popover that is collapsed by default, so
 * the rail can never cover a rack the operator is inspecting.
 *
 * Behaviour contract:
 *  - default collapsed; the preference is remembered per operator;
 *  - at 1440 px and below the popover always initialises collapsed;
 *  - Escape and outside click close it, focus returns to the trigger (Radix);
 *  - opening a rack inspection collapses it unless the operator pinned it;
 *  - the rail registers its own camera safe inset so the camera keeps the
 *    selected asset clear of it.
 */
import { useEffect, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Pin, PinOff, RotateCcw, Settings2, ZoomIn, ZoomOut } from 'lucide-react';
import { CAMERA_PRESET_LABELS, type CameraPresetId } from '@/three/cameraPresets';
import { QUALITY_PROFILES, type QualityProfileId } from '@/three/qualityProfiles';
import { insetFromElement, useCanvasSafeInsets } from '@/three/canvasSafeInsets';
import { INFRASTRUCTURE_LEVELS, type InfrastructureLevel } from './infrastructureLevel';
import type { ShellMode } from './DataHall';

const PIN_KEY = 'aura.sceneControls.pinned';
const COLLAPSE_BREAKPOINT = 1440;

const CAMERA_PRESETS: CameraPresetId[] = [
  'fitFacility',
  'topDown',
  'rackFront',
  'rackRear',
  'rackSide',
  'rackElevated',
  'frontAisles',
  'rearInfrastructure',
  'coolingTopology',
  'powerTopology',
  'fitSelection',
];

export interface SceneControlsRailProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  disabled?: boolean;
  /** Container the rail floats over, used to measure the camera safe inset. */
  containerRef: React.RefObject<HTMLElement>;
  /** True while the operator is inspecting a specific asset. */
  inspecting?: boolean;
  offsetTop?: boolean;
  onPreset: (preset: CameraPresetId) => void;
  quality: QualityProfileId;
  onQualityChange: (id: QualityProfileId) => void;
  shellMode: ShellMode;
  onShellModeChange?: (mode: ShellMode) => void;
  showLabels: boolean;
  onShowLabelsChange?: (next: boolean) => void;
  infrastructure: InfrastructureLevel;
  onInfrastructureChange: (level: InfrastructureLevel) => void;
  onResetCamera: () => void;
}

const selectClass =
  'w-full rounded border border-slate-600/70 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400';

export function SceneControlsRail(props: SceneControlsRailProps) {
  const {
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    disabled,
    containerRef,
    inspecting,
    offsetTop,
  } = props;

  const railRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const setInset = useCanvasSafeInsets((s) => s.setInset);

  // Remembered preference, never applied on narrow viewports.
  useEffect(() => {
    const stored = typeof window !== 'undefined' && window.localStorage.getItem(PIN_KEY) === 'true';
    const narrow = typeof window !== 'undefined' && window.innerWidth <= COLLAPSE_BREAKPOINT;
    setPinned(stored);
    setOpen(stored && !narrow);
  }, []);

  // Inspecting a rack collapses the popover unless deliberately pinned.
  useEffect(() => {
    if (inspecting && !pinned) setOpen(false);
  }, [inspecting, pinned]);

  // Register the rail rectangle so the camera treats it as protected.
  useEffect(() => {
    const measure = () => setInset('control-rail', insetFromElement(railRef.current, containerRef.current));
    measure();
    const ro = new ResizeObserver(measure);
    if (railRef.current) ro.observe(railRef.current);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      setInset('control-rail', null);
    };
  }, [containerRef, setInset]);

  useEffect(() => {
    if (!open) {
      setInset('scene-controls-popover', null);
    }
    return () => setInset('scene-controls-popover', null);
  }, [open, setInset]);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    window.localStorage.setItem(PIN_KEY, String(next));
  };

  return (
    <div
      ref={railRef}
      data-testid="canvas-control-rail"
      data-expanded={open ? 'true' : 'false'}
      data-pinned={pinned ? 'true' : 'false'}
      className={`pointer-events-auto absolute right-3 z-30 flex w-11 flex-col items-stretch gap-1 rounded-md border border-slate-700/60 bg-slate-900/85 p-1 backdrop-blur-sm ${
        offsetTop ? 'top-[3.75rem]' : 'top-3'
      }`}
    >
      <span
        className="select-none text-center text-[10px] font-semibold tabular-nums text-slate-200"
        data-testid="canvas-zoom-readout"
        aria-label={`Zoom ${Math.round(zoomLevel * 100)} percent`}
      >
        {Math.round(zoomLevel * 100)}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-300 hover:bg-slate-700/60 hover:text-white"
        onClick={onZoomIn}
        disabled={disabled || zoomLevel >= 2.5}
        aria-label="Zoom in"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-300 hover:bg-slate-700/60 hover:text-white"
        onClick={onZoomOut}
        disabled={disabled || zoomLevel <= 0.4}
        aria-label="Zoom out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-300 hover:bg-slate-700/60 hover:text-white"
        onClick={onZoomReset}
        disabled={disabled}
        aria-label="Reset zoom"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            data-testid="scene-controls-trigger"
            aria-label="Scene controls"
            aria-expanded={open}
            className="h-8 w-8 text-slate-300 hover:bg-slate-700/60 hover:text-white"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="left"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          data-testid="scene-controls-popover"
          className="z-[100] w-64 border-slate-700 bg-slate-900/97 p-3 text-slate-100"
          ref={(node) => setInset('scene-controls-popover', insetFromElement(node, containerRef.current))}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Scene controls</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-white"
              onClick={togglePin}
              aria-pressed={pinned}
              aria-label={pinned ? 'Unpin scene controls' : 'Pin scene controls open'}
            >
              {pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] text-slate-300">
              Camera view
              <select
                aria-label="Camera view"
                data-testid="twin-camera-preset"
                value=""
                onChange={(e) => {
                  const preset = e.target.value as CameraPresetId;
                  if (preset) props.onPreset(preset);
                }}
                className={selectClass}
              >
                <option value="">Select a view</option>
                {CAMERA_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {CAMERA_PRESET_LABELS[preset]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-[11px] text-slate-300">
              Quality
              <select
                aria-label="Rendering quality"
                value={props.quality}
                onChange={(e) => props.onQualityChange(e.target.value as QualityProfileId)}
                className={selectClass}
              >
                {Object.values(QUALITY_PROFILES).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-[11px] text-slate-300">
              Facility shell
              <select
                aria-label="Facility shell"
                data-testid="twin-shell-mode"
                value={props.shellMode}
                onChange={(e) => props.onShellModeChange?.(e.target.value as ShellMode)}
                className={selectClass}
              >
                <option value="off">Off</option>
                <option value="cutaway">Cutaway</option>
                <option value="full">Full</option>
              </select>
            </label>

            <label className="block text-[11px] text-slate-300">
              Infrastructure
              <select
                aria-label="Infrastructure"
                data-testid="twin-infrastructure-level"
                value={props.infrastructure}
                onChange={(e) => props.onInfrastructureChange(e.target.value as InfrastructureLevel)}
                className={selectClass}
              >
                {INFRASTRUCTURE_LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[10px] text-slate-400">
                {INFRASTRUCTURE_LEVELS.find((l) => l.id === props.infrastructure)?.description}
              </span>
            </label>

            <button
              type="button"
              data-testid="twin-labels-toggle"
              aria-pressed={props.showLabels}
              onClick={() => props.onShowLabelsChange?.(!props.showLabels)}
              className="w-full rounded border border-slate-600/70 bg-slate-900 px-2 py-1 text-xs text-slate-100 hover:bg-slate-800"
            >
              Labels: {props.showLabels ? 'On' : 'Off'}
            </button>

            <button
              type="button"
              data-testid="twin-reset-camera"
              onClick={props.onResetCamera}
              className="w-full rounded border border-slate-600/70 bg-slate-900 px-2 py-1 text-xs text-slate-100 hover:bg-slate-800"
            >
              Reset camera
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
