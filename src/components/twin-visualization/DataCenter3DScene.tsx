/**
 * DataCenter3DScene Component
 * Main 3D canvas with rack layout, power, thermal, and event overlays
 * Enhanced with smooth camera animations, zoom controls, and auto-orbit
 * UPGRADED: Added domain-specific overlay support (KPI tab binding)
 */

import { Component, Suspense, useState, useRef, useEffect, useCallback, useMemo, WheelEvent, type ReactNode } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { FacilityLighting } from './FacilityLighting';
import { DataHall, type ShellMode } from './DataHall';
import { overlayContract } from '@/three/overlayContract';
import {
  QUALITY_PROFILES,
  readQualityProfile,
  writeQualityProfile,
  type QualityProfileId,
} from '@/three/qualityProfiles';
import {
  facilityBoundsFromPositions,
  resolveCameraPreset,
  CAMERA_PRESET_LABELS,
  type CameraPresetId,
  type CameraPlacement,
} from '@/three/cameraPresets';
import {
  detectWebGLCapability,
  type WebGLCapabilityReport,
} from './webglCapability';
import { TwinFallback2D } from './TwinFallback2D';
import type { 
  RackVisual, 
  RowVisual, 
  PowerSegmentVisual, 
  ThermalZoneVisual,
  SimulationEventVisual 
} from './types';
import { RackGroup } from './RackGroup';
import { getThermalColor, getUtilizationColor, getPowerColor } from './types';
import { ThermalOverlayLayer } from './ThermalOverlayLayer';
import { PowerFlowLayer } from './PowerFlowLayer';
import { SovereigntyOverlayLayer } from './SovereigntyOverlayLayer';
import { CoolingOverlayLayer } from './CoolingOverlayLayer';
import { WorkloadOverlayLayer } from './WorkloadOverlayLayer';
import { ZoomControlsOverlay } from './ZoomControlsOverlay';

// Zoom configuration constants
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.2;
const IDLE_THRESHOLD_MS = 8000; // 8 seconds before auto-orbit

// Supported overlay domains for KPI tab binding
export type OverlayDomain = 
  | 'none' 
  | 'pue' 
  | 'gpu' 
  | 'thermal' 
  | 'cooling' 
  | 'sovereignty' 
  | 'workload'
  | 'power'
  | 'network'
  | 'carbon';

interface DataCenter3DSceneProps {
  racks: RackVisual[];
  rows: RowVisual[];
  powerSegments: PowerSegmentVisual[];
  thermalZones: ThermalZoneVisual[];
  events: SimulationEventVisual[];
  showPower?: boolean;
  showThermal?: boolean;
  showEvents?: boolean;
  compact?: boolean;
  /** Fill the parent container instead of using a fixed preview height. */
  fill?: boolean;
  mode?: 'dashboard' | 'blueprint' | 'simulation';
  onRackClick?: (rackId: string) => void;
  /** Active overlay domain - binds to KPI tab selection */
  activeOverlay?: OverlayDomain;
  /** Simulation KPIs for overlay customization */
  simulationKpis?: Record<string, number>;
  /**
   * The host renders its own toolbar in the top-left corner (layer selector,
   * 3D/2D switch). Offsets the in-scene camera bar so the two never overlap.
   */
  hostChromeTop?: boolean;
  /** Currently selected asset, highlighted without replacing its material. */
  selectedAssetId?: string | null;
  /** Facility shell visibility. Defaults to the operator view (off). */
  shellMode?: ShellMode;
  onShellModeChange?: (mode: ShellMode) => void;
  /** Row annotation visibility. */
  showLabels?: boolean;
  onShowLabelsChange?: (next: boolean) => void;
}

interface CanvasMountBoundaryProps {
  children: ReactNode;
  onFailure: (error: Error) => void;
}

class CanvasMountBoundary extends Component<CanvasMountBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onFailure(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface CameraControllerProps {
  targetDistance: number;
  baseDistance: number;
  targetPosition: THREE.Vector3;
  initialFlyIn: boolean;
  mode?: 'dashboard' | 'blueprint' | 'simulation';
  lastInteractionTime: number;
  /** Placement requested by a camera preset, applied on change. */
  placement?: CameraPlacement | null;
  /** Skip transitions when the operator prefers reduced motion. */
  reducedMotion?: boolean;
}

// Camera controller component for smooth animations
function CameraController({ 
  targetDistance, 
  baseDistance,
  targetPosition,
  initialFlyIn,
  mode,
  lastInteractionTime,
  placement,
  reducedMotion,
}: CameraControllerProps) {
  const { camera, invalidate } = useThree();
  const distanceRef = useRef(initialFlyIn ? baseDistance * 2.5 : baseDistance);
  const thetaRef = useRef(0.4); // Azimuth angle
  const phiRef = useRef(0.8); // Polar angle
  const hasAnimatedIn = useRef(false);
  const appliedPlacement = useRef<CameraPlacement | null>(null);

  // Apply a preset placement once per change (angles + look-at target).
  if (placement && placement !== appliedPlacement.current) {
    appliedPlacement.current = placement;
    thetaRef.current = placement.theta;
    phiRef.current = placement.phi;
    if (reducedMotion) distanceRef.current = placement.distance;
  }

  const focus = placement
    ? new THREE.Vector3(placement.target[0], placement.target[1], placement.target[2])
    : targetPosition;
  // Manual zoom stays authoritative even while a preset placement is active:
  // targetDistance/baseDistance encodes the operator zoom factor (1 / zoom).
  const zoomScale = baseDistance > 0 ? targetDistance / baseDistance : 1;
  const distance = placement ? placement.distance * zoomScale : targetDistance;
  
  useFrame((state, delta) => {
    // Lerp distance toward target
    const lerpFactor = reducedMotion ? 1 : initialFlyIn && !hasAnimatedIn.current ? 0.03 : 0.06;
    distanceRef.current += (distance - distanceRef.current) * lerpFactor;
    
    // Mark fly-in as complete when close enough
    if (Math.abs(distanceRef.current - distance) < 0.5) {
      hasAnimatedIn.current = true;
    }
    
    // Auto-orbit in simulation mode when idle
    const isIdle = Date.now() - lastInteractionTime > IDLE_THRESHOLD_MS;
    if (mode === 'simulation' && isIdle && hasAnimatedIn.current && !reducedMotion) {
      thetaRef.current += 0.002; // Very slow rotation
    }
    
    // Calculate camera position using spherical coordinates
    const x = focus.x + distanceRef.current * Math.sin(phiRef.current) * Math.cos(thetaRef.current);
    const y = focus.y + distanceRef.current * Math.cos(phiRef.current);
    const z = focus.z + distanceRef.current * Math.sin(phiRef.current) * Math.sin(thetaRef.current);
    
    // Smooth interpolation to new position
    camera.position.lerp(new THREE.Vector3(x, y, z), lerpFactor);
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
    
    invalidate();
  });

  return null;
}

function Scene({ 
  racks, 
  rows, 
  powerSegments, 
  thermalZones,
  showPower,
  showThermal,
  compact,
  mode,
  onRackClick,
  targetDistance,
  baseDistance,
  lastInteractionTime,
  activeOverlay,
  simulationKpis,
  qualityProfile,
  placement,
  reducedMotion,
  selectedAssetId,
  shellMode,
  showLabels,
}: Omit<DataCenter3DSceneProps, 'events'> & { 
  targetDistance: number; 
  baseDistance: number;
  lastInteractionTime: number;
  qualityProfile: QualityProfileId;
  placement: CameraPlacement | null;
  reducedMotion: boolean;
}) {
  const controlsRef = useRef<any>(null);

  // Facility extents derived from the real rack positions.
  const extents = useMemo(() => {
    const xs = racks.map((r) => r.position[0]);
    const zs = [...rows.map((r) => r.position[2]), ...racks.map((r) => r.position[2])];
    return {
      minX: xs.length ? Math.min(...xs) - 0.8 : -4,
      maxX: xs.length ? Math.max(...xs) + 0.8 : 4,
      minZ: zs.length ? Math.min(...zs) - 1.6 : -4,
      maxZ: zs.length ? Math.max(...zs) + 1.6 : 4,
    };
  }, [racks, rows]);

  const centre: [number, number, number] = [
    (extents.minX + extents.maxX) / 2,
    1.0,
    (extents.minZ + extents.maxZ) / 2,
  ];
  const hallRadius = Math.max(
    6,
    Math.hypot((extents.maxX - extents.minX) / 2 + 2, (extents.maxZ - extents.minZ) / 2 + 2),
  );

  const targetPosition = new THREE.Vector3(centre[0], centre[1], centre[2]);
  const profile = QUALITY_PROFILES[qualityProfile];

  // Framing that fills the viewport with the hall instead of empty floor.
  const cameraPosition: [number, number, number] = [
    centre[0] + hallRadius * 0.9,
    hallRadius * 0.75,
    centre[2] + hallRadius * 1.05,
  ];

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={cameraPosition}
        fov={compact ? 45 : 40}
      />
      <OrbitControls 
        ref={controlsRef}
        enablePan={!compact}
        enableZoom={false} // We handle zoom manually
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.1}
        target={[targetPosition.x, targetPosition.y, targetPosition.z]}
        enableDamping
        dampingFactor={0.05}
      />
      
      <CameraController 
        targetDistance={targetDistance}
        baseDistance={baseDistance}
        targetPosition={targetPosition}
        initialFlyIn={true}
        mode={mode}
        lastInteractionTime={lastInteractionTime}
        placement={placement}
        reducedMotion={reducedMotion}
      />

      {/* Industrial lighting rig (neutral 4000-5000K, quality-profile aware) */}
      <FacilityLighting centre={centre} radius={hallRadius} profile={profile} />

      {/* Architectural environment: raised floor, walls, ceiling frame,
          cable trays, busway, cooling routes, containment and markings. */}
      <DataHall
        bounds={extents}
        rows={rows}
        profile={profile}
        crahUnits={thermalZones.length}
        shellMode={shellMode ?? 'off'}
      />

      {/* Grounded contact shadows (high profile only) */}
      {profile.ambientOcclusion && (
        <ContactShadows
          position={[centre[0], 0.012, centre[2]]}
          scale={hallRadius * 2.6}
          resolution={1024}
          blur={2.4}
          opacity={0.55}
          far={4}
          frames={1}
        />
      )}

      {/* Domain-specific overlays based on KPI tab selection */}
      {/* Thermal overlay - show when thermal domain active or explicit showThermal */}
      <ThermalOverlayLayer 
        zones={thermalZones} 
        visible={showThermal || activeOverlay === 'thermal'} 
      />

      {/* Power flow - show when PUE or power domain active */}
      <PowerFlowLayer 
        segments={powerSegments} 
        visible={showPower || activeOverlay === 'pue' || activeOverlay === 'power'} 
      />

      {/* Sovereignty overlay - show when sovereignty domain active */}
      <SovereigntyOverlayLayer 
        visible={activeOverlay === 'sovereignty'}
        rackCount={racks.length}
      />

      {/* Cooling overlay - show when cooling domain active */}
      <CoolingOverlayLayer 
        visible={activeOverlay === 'cooling'}
        coolingEfficiency={simulationKpis?.coolingEfficiencyIndex}
      />

      {/* Workload/GPU overlay - show when gpu or workload domain active */}
      <WorkloadOverlayLayer 
        visible={activeOverlay === 'gpu' || activeOverlay === 'workload'}
        racks={racks}
        avgGpuUtilization={simulationKpis?.avgGpuUtilization}
      />

      {/* Carbon: facility-level only. AURA holds no per-rack energy allocation
          evidence, so the layer renders the facility energy envelope rather
          than inventing rack-level emissions. */}
      {activeOverlay === 'carbon' && (
        <group name="overlay:carbon-facility">
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[centre[0], 0.02, centre[2]]}
            renderOrder={1}
          >
            <planeGeometry args={[extents.maxX - extents.minX + 5, extents.maxZ - extents.minZ + 5]} />
            <meshBasicMaterial color="#0ea5a4" transparent opacity={0.16} depthWrite={false} />
          </mesh>
          <mesh position={[centre[0], 3.05, extents.minZ - 1.2]} renderOrder={1}>
            <boxGeometry args={[extents.maxX - extents.minX + 4, 0.18, 0.18]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.75} />
          </mesh>
        </group>
      )}

      {/* Rack groups */}
      {rows.map((row) => (
        <RackGroup 
          key={row.id}
          row={row}
          racks={racks}
          showThermal={showThermal || activeOverlay === 'thermal'}
          onRackClick={onRackClick}
          detailed={racks.length <= profile.detailBudget}
          detailLevel={profile.rackDetail}
          selectedRackId={selectedAssetId ?? null}
          showLabels={showLabels !== false}
          overlayColorFor={(rack) => {
            switch (activeOverlay) {
              case 'thermal':
              case 'cooling':
                return getThermalColor(rack.thermalCelsius);
              case 'gpu':
              case 'workload':
                return getUtilizationColor(rack.gpuLoad ?? rack.utilizationPercent);
              case 'power':
              case 'pue':
                return getPowerColor(rack.powerKw / 12, false);
              case 'carbon':
                // Rack-level carbon allocation is not evidenced: no rack tint.
                return null;
              default:
                return null;
            }
          }}
        />
      ))}
    </>
  );
}

export function DataCenter3DScene(props: DataCenter3DSceneProps) {
  const [capability, setCapability] = useState<WebGLCapabilityReport>(() => ({
    status: 'ok',
    reason: 'Pending detection.',
  }));
  const [runtimeError, setRuntimeError] = useState<WebGLCapabilityReport | null>(
    null,
  );
  const [contextLost, setContextLost] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [qualityProfile, setQualityProfile] = useState<QualityProfileId>(() => readQualityProfile());
  const [placement, setPlacement] = useState<CameraPlacement | null>(null);

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const bounds = useMemo(
    () => facilityBoundsFromPositions(props.racks.map((r) => r.position)),
    [props.racks],
  );

  // The default view is the calculated facility overview, so "Reset camera"
  // always returns to a computed fit rather than a hardcoded position.
  useEffect(() => {
    setPlacement(resolveCameraPreset('fitFacility', bounds));
  }, [bounds]);

  const applyPreset = useCallback(
    (preset: CameraPresetId) => {
      setLastInteractionTime(Date.now());
      setPlacement(resolveCameraPreset(preset, bounds));
    },
    [bounds],
  );

  const changeQuality = useCallback((id: QualityProfileId) => {
    setQualityProfile(id);
    writeQualityProfile(id);
  }, []);
  
  const baseDistance = props.compact ? 22 : 30;
  const [targetDistance, setTargetDistance] = useState(baseDistance);
  
  // Proactive capability detection - runs before mounting <Canvas />.
  useEffect(() => {
    setCapability(detectWebGLCapability());
  }, []);

  const recheckCapability = useCallback(() => {
    setRuntimeError(null);
    setCapability(detectWebGLCapability());
  }, []);

  const handleCanvasFailure = useCallback((error: Error) => {
    setRuntimeError({
      status: 'unknown',
      reason: error.message || 'WebGL context creation failed.',
    });
  }, []);

  const activeReport = runtimeError ?? capability;
  const canRender3D = activeReport.status === 'ok';

  // Handle WebGL context lost/restored
  useEffect(() => {
    const handleContextLost = () => {
      setContextLost(true);
    };
    
    const handleContextRestored = () => {
      setContextLost(false);
    };
    
    const container = canvasContainerRef.current;
    const canvas = container?.querySelector('canvas');
    
    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);
      
      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      };
    }
  }, [canRender3D]);
  
  // Mark user interaction
  const markInteraction = useCallback(() => {
    setLastInteractionTime(Date.now());
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    markInteraction();
    setZoomLevel(prev => {
      const next = Math.min(MAX_ZOOM, prev + ZOOM_STEP);
      setTargetDistance(baseDistance / next);
      return next;
    });
  }, [baseDistance, markInteraction]);

  const handleZoomOut = useCallback(() => {
    markInteraction();
    setZoomLevel(prev => {
      const next = Math.max(MIN_ZOOM, prev - ZOOM_STEP);
      setTargetDistance(baseDistance / next);
      return next;
    });
  }, [baseDistance, markInteraction]);

  const handleReset = useCallback(() => {
    markInteraction();
    setZoomLevel(1);
    setTargetDistance(baseDistance);
  }, [baseDistance, markInteraction]);

  // Mouse wheel zoom
  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    markInteraction();
    
    if (event.deltaY > 0) {
      // Scroll down = zoom out
      setZoomLevel(prev => {
        const next = Math.max(MIN_ZOOM, prev - ZOOM_STEP * 0.5);
        setTargetDistance(baseDistance / next);
        return next;
      });
    } else {
      // Scroll up = zoom in
      setZoomLevel(prev => {
        const next = Math.min(MAX_ZOOM, prev + ZOOM_STEP * 0.5);
        setTargetDistance(baseDistance / next);
        return next;
      });
    }
  }, [baseDistance, markInteraction]);

  // Fail early with an informative fallback if WebGL2 isn't usable.
  if (!canRender3D) {
    return (
      <TwinFallback2D
        report={activeReport}
        racks={props.racks}
        rows={props.rows}
        compact={props.compact}
        onRetry={recheckCapability}
        onRackClick={props.onRackClick}
      />
    );
  }

  const height = props.fill ? 'h-full' : props.compact ? 'h-72' : 'h-[450px]';

  return (
    <div
      className={`relative ${height} w-full overflow-hidden bg-[#0a0a14] ${
        props.fill ? '' : 'rounded-lg border border-slate-700/50'
      }`}
    >
      {/* Zoom controls overlay */}
      <ZoomControlsOverlay
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        zoomLevel={zoomLevel}
        disabled={contextLost}
      />

      {/* Canvas toolbar, protected groups.
          Left is reserved for the host (layer selector, 3D/2D).
          Centre: camera presets. Right: quality profile and fit action.
          Top-right above these: the zoom control zone. */}
      {!props.compact && (
        <>
          <div
            className={`absolute right-[4.75rem] z-20 flex max-w-[calc(100%-6.5rem)] flex-wrap items-center justify-end gap-1.5 ${
              props.hostChromeTop ? 'top-[3.75rem]' : 'top-14'
            }`}
            role="group"
            aria-label="View settings"
          >
            <label className="flex items-center gap-1.5 rounded-md border border-slate-600/70 bg-slate-900/85 px-2 py-1 text-xs text-slate-100">
              <span className="sr-only">Camera view</span>
              <select
                aria-label="Camera view"
                data-testid="twin-camera-preset"
                value=""
                onChange={(e) => {
                  const preset = e.target.value as CameraPresetId;
                  if (preset) applyPreset(preset);
                }}
                className="max-w-[10rem] bg-transparent text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                <option value="" className="bg-slate-900">
                  Camera view
                </option>
                {(
                  [
                    'fitFacility',
                    'topDown',
                    'frontAisles',
                    'rearInfrastructure',
                    'coolingTopology',
                    'powerTopology',
                    'fitSelection',
                  ] as CameraPresetId[]
                ).map((preset) => (
                  <option key={preset} value={preset} className="bg-slate-900">
                    {CAMERA_PRESET_LABELS[preset]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 rounded-md border border-slate-600/70 bg-slate-900/85 px-2 py-1 text-xs text-slate-100">
              <span className="sr-only">Rendering quality</span>
              <select
                aria-label="Rendering quality"
                value={qualityProfile}
                onChange={(e) => changeQuality(e.target.value as QualityProfileId)}
                className="max-w-[9rem] bg-transparent text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                {Object.values(QUALITY_PROFILES).map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900">
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 rounded-md border border-slate-600/70 bg-slate-900/85 px-2 py-1 text-xs text-slate-100">
              <span className="hidden sm:inline text-slate-300">Facility shell</span>
              <span className="sr-only">Facility shell</span>
              <select
                aria-label="Facility shell"
                data-testid="twin-shell-mode"
                value={props.shellMode ?? 'off'}
                onChange={(e) => props.onShellModeChange?.(e.target.value as ShellMode)}
                className="bg-transparent text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                <option value="off" className="bg-slate-900">Off</option>
                <option value="cutaway" className="bg-slate-900">Cutaway</option>
                <option value="full" className="bg-slate-900">Full</option>
              </select>
            </label>
            <button
              type="button"
              data-testid="twin-labels-toggle"
              aria-pressed={props.showLabels !== false}
              onClick={() => props.onShowLabelsChange?.(!(props.showLabels !== false))}
              className="rounded-md border border-slate-600/70 bg-slate-900/85 px-2.5 py-1.5 text-xs text-slate-100 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              Labels: {props.showLabels !== false ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('reset')}
              title="Reset camera to the calculated facility overview"
              className="rounded-md border border-slate-600/70 bg-slate-900/85 px-2.5 py-1.5 text-xs text-slate-100 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              Reset camera
            </button>
          </div>
        </>
      )}

      {/* Context lost overlay */}
      {contextLost && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
          <div className="text-center p-4">
            <div className="text-2xl mb-2">⚠️</div>
            <p className="text-sm text-slate-300 mb-2">3D rendering paused</p>
            <p className="text-xs text-slate-300">WebGL context will restore automatically</p>
          </div>
        </div>
      )}

      {/* Canvas container with wheel handler */}
      <div
        data-testid="twin-canvas-container"
        ref={canvasContainerRef}
        className="h-full w-full" 
        onWheel={handleWheel}
        onMouseDown={markInteraction}
        onTouchStart={markInteraction}
      >
        <CanvasMountBoundary onFailure={handleCanvasFailure}>
          <Canvas
            data-testid="twin-canvas"
            dpr={QUALITY_PROFILES[qualityProfile].dpr}
            shadows={QUALITY_PROFILES[qualityProfile].shadows}
            frameloop="always"
            gl={{ 
              antialias: QUALITY_PROFILES[qualityProfile].antialias,
              failIfMajorPerformanceCaveat: false,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.05,
            }}
            onCreated={({ gl }) => {
              if (!gl.capabilities.isWebGL2) {
                setRuntimeError({
                  status: 'webgl1-only',
                  reason:
                    'The 3D renderer initialised without WebGL 2 support.',
                });
              }
            }}
            onError={(event) => {
              const message =
                (event as unknown as { message?: string })?.message ||
                'WebGL context creation failed.';
              setRuntimeError({
                status: 'unknown',
                reason: message,
              });
            }}
          >
            <Suspense fallback={null}>
              <Scene 
                {...props} 
                targetDistance={targetDistance}
                baseDistance={baseDistance}
                lastInteractionTime={lastInteractionTime}
                activeOverlay={props.activeOverlay}
                simulationKpis={props.simulationKpis}
                qualityProfile={qualityProfile}
                placement={placement}
                reducedMotion={reducedMotion}
              />
            </Suspense>
          </Canvas>
        </CanvasMountBoundary>
      </div>

      {/* Thermal/Power legend */}
      <div className="absolute bottom-3 left-3 flex gap-2 pointer-events-none">
        {props.showThermal && (
          <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-md px-2.5 py-1.5 text-xs flex items-center gap-2 animate-fade-in pointer-events-auto">
            <span className="text-slate-300 font-medium">Thermal:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500 shadow-sm shadow-blue-500/30" />
              <span className="text-slate-300">Cool</span>
              <span className="w-3 h-3 rounded-sm bg-amber-500 ml-1 shadow-sm shadow-amber-500/30" />
              <span className="text-slate-300">Warm</span>
              <span className="w-3 h-3 rounded-sm bg-red-500 ml-1 shadow-sm shadow-red-500/30" />
              <span className="text-slate-300">Hot</span>
            </span>
          </div>
        )}
        {props.showPower && (
          <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-md px-2.5 py-1.5 text-xs flex items-center gap-2 animate-fade-in pointer-events-auto">
            <span className="text-slate-300 font-medium">Power:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 shadow-sm shadow-emerald-500/30" />
              <span className="text-slate-300">OK</span>
              <span className="w-3 h-3 rounded-sm bg-amber-500 ml-1 shadow-sm shadow-amber-500/30" />
              <span className="text-slate-300">High</span>
              <span className="w-3 h-3 rounded-sm bg-red-500 ml-1 shadow-sm shadow-red-500/30" />
              <span className="text-slate-300">Critical</span>
            </span>
          </div>
        )}
      </div>

      {/* Mode indicator for simulation */}
      {props.mode === 'simulation' && (
        <div className="absolute bottom-3 right-3 bg-blue-600/20 backdrop-blur-sm border border-blue-500/40 rounded-md px-2.5 py-1 text-xs text-blue-300 flex items-center gap-1.5 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Live Simulation
        </div>
      )}
    </div>
  );
}
