/**
 * DataCenter3DScene Component
 * Main 3D canvas with rack layout, power, thermal, and event overlays
 * Enhanced with smooth camera animations, zoom controls, and auto-orbit
 * UPGRADED: Added domain-specific overlay support (KPI tab binding)
 */

import { Suspense, useState, useRef, useEffect, useCallback, WheelEvent } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { 
  RackVisual, 
  RowVisual, 
  PowerSegmentVisual, 
  ThermalZoneVisual,
  SimulationEventVisual 
} from './types';
import { RackGroup } from './RackGroup';
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
  mode?: 'dashboard' | 'blueprint' | 'simulation';
  onRackClick?: (rackId: string) => void;
  /** Active overlay domain - binds to KPI tab selection */
  activeOverlay?: OverlayDomain;
  /** Simulation KPIs for overlay customization */
  simulationKpis?: Record<string, number>;
}

interface CameraControllerProps {
  targetDistance: number;
  baseDistance: number;
  targetPosition: THREE.Vector3;
  initialFlyIn: boolean;
  mode?: 'dashboard' | 'blueprint' | 'simulation';
  lastInteractionTime: number;
}

// Camera controller component for smooth animations
function CameraController({ 
  targetDistance, 
  baseDistance,
  targetPosition,
  initialFlyIn,
  mode,
  lastInteractionTime
}: CameraControllerProps) {
  const { camera, invalidate } = useThree();
  const distanceRef = useRef(initialFlyIn ? baseDistance * 2.5 : baseDistance);
  const thetaRef = useRef(0.4); // Azimuth angle
  const phiRef = useRef(0.8); // Polar angle
  const hasAnimatedIn = useRef(false);
  
  useFrame((state, delta) => {
    // Lerp distance toward target
    const lerpFactor = initialFlyIn && !hasAnimatedIn.current ? 0.03 : 0.06;
    distanceRef.current += (targetDistance - distanceRef.current) * lerpFactor;
    
    // Mark fly-in as complete when close enough
    if (Math.abs(distanceRef.current - targetDistance) < 0.5) {
      hasAnimatedIn.current = true;
    }
    
    // Auto-orbit in simulation mode when idle
    const isIdle = Date.now() - lastInteractionTime > IDLE_THRESHOLD_MS;
    if (mode === 'simulation' && isIdle && hasAnimatedIn.current) {
      thetaRef.current += 0.002; // Very slow rotation
    }
    
    // Calculate camera position using spherical coordinates
    const x = targetPosition.x + distanceRef.current * Math.sin(phiRef.current) * Math.cos(thetaRef.current);
    const y = targetPosition.y + distanceRef.current * Math.cos(phiRef.current);
    const z = targetPosition.z + distanceRef.current * Math.sin(phiRef.current) * Math.sin(thetaRef.current);
    
    // Smooth interpolation to new position
    camera.position.lerp(new THREE.Vector3(x, y, z), lerpFactor);
    camera.lookAt(targetPosition);
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
}: Omit<DataCenter3DSceneProps, 'events'> & { 
  targetDistance: number; 
  baseDistance: number;
  lastInteractionTime: number;
}) {
  const controlsRef = useRef<any>(null);
  
  // Calculate scene bounds
  const maxZ = Math.max(...rows.map(r => r.position[2]), 5) + 5;
  const maxX = Math.max(...racks.map(r => r.position[0]), 8) + 3;
  
  const targetPosition = new THREE.Vector3(maxX / 2, 0.5, maxZ / 2);
  
  // Initial camera position for fly-in
  const cameraPosition: [number, number, number] = compact 
    ? [maxX * 0.8 + 15, 18, maxZ + 15]
    : [maxX * 0.7 + 20, 22, maxZ + 18];

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
      />

      {/* Enhanced Lighting */}
      <ambientLight intensity={0.25} color="#8899bb" />
      <directionalLight 
        position={[15, 20, 15]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
        color="#ffffff"
      />
      <directionalLight position={[-10, 8, -10]} intensity={0.15} color="#4488ff" />
      <pointLight position={[maxX / 2, 6, maxZ / 2]} intensity={0.3} color="#6699ff" distance={20} />

      {/* Environment - night mode for NOC aesthetic */}
      <Environment preset="night" />
      <fog attach="fog" args={['#0a0a1a', 15, 60]} />

      {/* Dark floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[maxX / 2, -0.02, maxZ / 2]} receiveShadow>
        <planeGeometry args={[maxX + 20, maxZ + 20]} />
        <meshStandardMaterial 
          color="#0d0d1a" 
          roughness={0.95} 
          metalness={0.05}
        />
      </mesh>

      {/* Grid */}
      <Grid 
        position={[maxX / 2, 0, maxZ / 2]}
        args={[maxX + 16, maxZ + 16]}
        cellSize={0.8}
        cellThickness={0.3}
        cellColor="#1a1a3a"
        sectionSize={4}
        sectionThickness={0.8}
        sectionColor="#2a2a4a"
        fadeDistance={40}
        fadeStrength={1.2}
        followCamera={false}
      />

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

      {/* Rack groups */}
      {rows.map((row) => (
        <RackGroup 
          key={row.id}
          row={row}
          racks={racks}
          showThermal={showThermal || activeOverlay === 'thermal'}
          onRackClick={onRackClick}
        />
      ))}
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading 3D Twin...</p>
      </div>
    </div>
  );
}

function WebGLFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-4">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-3">🏢</div>
        <h3 className="font-semibold text-slate-100 mb-1">3D View Unavailable</h3>
        <p className="text-sm text-slate-400">
          Interactive 3D twin is not available on this device. 
          Showing topology data in 2D instead.
        </p>
      </div>
    </div>
  );
}

export function DataCenter3DScene(props: DataCenter3DSceneProps) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  const baseDistance = props.compact ? 22 : 30;
  const [targetDistance, setTargetDistance] = useState(baseDistance);
  
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
  }, [hasWebGL]);
  
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

  // Check for WebGL support
  if (typeof window !== 'undefined' && !hasWebGL) {
    return <WebGLFallback />;
  }

  const height = props.compact ? 'h-72' : 'h-[450px]';

  return (
    <div className={`relative ${height} w-full rounded-lg overflow-hidden border border-slate-700/50 bg-[#0a0a14]`}>
      {/* Zoom controls overlay */}
      <ZoomControlsOverlay
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        zoomLevel={zoomLevel}
        disabled={contextLost}
      />

      {/* Context lost overlay */}
      {contextLost && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
          <div className="text-center p-4">
            <div className="text-2xl mb-2">⚠️</div>
            <p className="text-sm text-slate-300 mb-2">3D rendering paused</p>
            <p className="text-xs text-slate-500">WebGL context will restore automatically</p>
          </div>
        </div>
      )}

      {/* Canvas container with wheel handler */}
      <div 
        ref={canvasContainerRef}
        className="h-full w-full" 
        onWheel={handleWheel}
        onMouseDown={markInteraction}
        onTouchStart={markInteraction}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            dpr={[1, 1.5]}
            frameloop="always"
            gl={{ 
              antialias: true,
              failIfMajorPerformanceCaveat: true,
              powerPreference: 'high-performance'
            }}
            onCreated={({ gl }) => {
              if (!gl.capabilities.isWebGL2) {
                setHasWebGL(false);
              }
            }}
            onError={() => setHasWebGL(false)}
          >
            <Scene 
              {...props} 
              targetDistance={targetDistance}
              baseDistance={baseDistance}
              lastInteractionTime={lastInteractionTime}
              activeOverlay={props.activeOverlay}
              simulationKpis={props.simulationKpis}
            />
          </Canvas>
        </Suspense>
      </div>

      {/* Thermal/Power legend */}
      <div className="absolute bottom-3 left-3 flex gap-2 pointer-events-none">
        {props.showThermal && (
          <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-md px-2.5 py-1.5 text-xs flex items-center gap-2 animate-fade-in pointer-events-auto">
            <span className="text-slate-400 font-medium">Thermal:</span>
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
            <span className="text-slate-400 font-medium">Power:</span>
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
