/**
 * DataCenter3DScene Component
 * Main 3D canvas with rack layout, power, thermal, and event overlays
 */

import { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PerspectiveCamera } from '@react-three/drei';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onRackClick?: (rackId: string) => void;
}

// Camera controller component for smooth zoom animations
function CameraController({ 
  zoomLevel, 
  compact,
  maxX,
  maxZ
}: { 
  zoomLevel: number; 
  compact: boolean;
  maxX: number;
  maxZ: number;
}) {
  const { camera, invalidate } = useThree();
  const targetRef = useRef(new THREE.Vector3());
  const baseDistance = compact ? 20 : 28;
  
  useEffect(() => {
    const targetDistance = baseDistance / zoomLevel;
    
    // Get direction from target to camera
    const target = new THREE.Vector3(maxX / 2, 0.5, maxZ / 2);
    const direction = camera.position.clone().sub(target).normalize();
    
    // Calculate new position at target distance
    const newPos = target.clone().add(direction.multiplyScalar(targetDistance));
    
    // Smooth animation using lerp
    let animationId: number;
    const animate = () => {
      const lerpFactor = 0.06;
      camera.position.lerp(newPos, lerpFactor);
      camera.updateProjectionMatrix();
      invalidate();
      
      if (camera.position.distanceTo(newPos) > 0.05) {
        animationId = requestAnimationFrame(animate);
      }
    };
    
    animate();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [zoomLevel, camera, baseDistance, maxX, maxZ, invalidate]);

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
  onRackClick,
  zoomLevel
}: Omit<DataCenter3DSceneProps, 'events'> & { zoomLevel: number }) {
  const controlsRef = useRef<any>(null);
  
  // Calculate camera position based on layout
  const maxZ = Math.max(...rows.map(r => r.position[2]), 5) + 5;
  const maxX = Math.max(...racks.map(r => r.position[0]), 8) + 3;
  
  // Improved camera angle - more dramatic isometric view
  const cameraPosition: [number, number, number] = compact 
    ? [maxX * 0.8, 12, maxZ + 8]
    : [maxX * 0.7, 16, maxZ + 12];

  const targetPosition: [number, number, number] = [maxX / 2, 0.5, maxZ / 2];

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
        enableZoom={true}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={compact ? 40 : 80}
        target={targetPosition}
        enableDamping
        dampingFactor={0.05}
        zoomSpeed={0.8}
      />
      
      <CameraController 
        zoomLevel={zoomLevel} 
        compact={compact || false}
        maxX={maxX}
        maxZ={maxZ}
      />

      {/* Enhanced Lighting - darker ambient with dramatic directional */}
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

      {/* Dark floor with subtle grid lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[maxX / 2, -0.02, maxZ / 2]} receiveShadow>
        <planeGeometry args={[maxX + 20, maxZ + 20]} />
        <meshStandardMaterial 
          color="#0d0d1a" 
          roughness={0.95} 
          metalness={0.05}
        />
      </mesh>

      {/* Grid with improved styling */}
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

      {/* Thermal overlay */}
      <ThermalOverlayLayer zones={thermalZones} visible={showThermal || false} />

      {/* Power flow */}
      <PowerFlowLayer segments={powerSegments} visible={showPower || false} />

      {/* Rack groups */}
      {rows.map((row) => (
        <RackGroup 
          key={row.id}
          row={row}
          racks={racks}
          showThermal={showThermal || false}
          onRackClick={onRackClick}
        />
      ))}
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading 3D Twin...</p>
      </div>
    </div>
  );
}

function WebGLFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/80 p-4">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-3">🏢</div>
        <h3 className="font-semibold text-foreground mb-1">3D View Unavailable</h3>
        <p className="text-sm text-muted-foreground">
          Interactive 3D twin is not available on this device. 
          Showing topology data in 2D instead.
        </p>
      </div>
    </div>
  );
}

export function DataCenter3DScene(props: DataCenter3DSceneProps) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  // Check for WebGL support
  if (typeof window !== 'undefined' && !hasWebGL) {
    return <WebGLFallback />;
  }

  const height = props.compact ? 'h-72' : 'h-[450px]';

  return (
    <div className={`relative ${height} w-full rounded-lg overflow-hidden border border-border bg-[#0a0a14]`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          dpr={[1, 1.5]}
          frameloop="always"
          gl={{ 
            antialias: true,
            failIfMajorPerformanceCaveat: true 
          }}
          onCreated={({ gl }) => {
            if (!gl.capabilities.isWebGL2) {
              setHasWebGL(false);
            }
          }}
          onError={() => setHasWebGL(false)}
        >
          <Scene {...props} zoomLevel={zoomLevel} />
        </Canvas>
      </Suspense>

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 animate-fade-in">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4 text-slate-200" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4 text-slate-200" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
          onClick={handleResetZoom}
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4 text-slate-200" />
        </Button>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-300 font-medium transition-all duration-300">
        <span className="tabular-nums">{Math.round(zoomLevel * 100)}%</span>
      </div>

      {/* Overlay legend */}
      <div className="absolute bottom-2 left-2 flex gap-2">
        {props.showThermal && (
          <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded px-2 py-1 text-xs flex items-center gap-2 animate-fade-in">
            <span className="text-slate-400">Thermal:</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-blue-500" /> Cool
              <span className="w-3 h-3 rounded-sm bg-amber-500 ml-1" /> Warm
              <span className="w-3 h-3 rounded-sm bg-red-500 ml-1" /> Hot
            </span>
          </div>
        )}
        {props.showPower && (
          <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded px-2 py-1 text-xs flex items-center gap-2 animate-fade-in">
            <span className="text-slate-400">Power:</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-green-500" /> OK
              <span className="w-3 h-3 rounded-sm bg-amber-500 ml-1" /> High
              <span className="w-3 h-3 rounded-sm bg-red-500 ml-1" /> Critical
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
