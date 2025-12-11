/**
 * DataCenter3DScene Component
 * Main 3D canvas with rack layout, power, thermal, and event overlays
 */

import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PerspectiveCamera } from '@react-three/drei';
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

function Scene({ 
  racks, 
  rows, 
  powerSegments, 
  thermalZones,
  showPower,
  showThermal,
  compact,
  onRackClick 
}: Omit<DataCenter3DSceneProps, 'events'>) {
  // Calculate camera position based on layout
  const maxZ = Math.max(...rows.map(r => r.position[2])) + 5;
  const maxX = Math.max(...racks.map(r => r.position[0])) + 3;
  
  const cameraPosition: [number, number, number] = compact 
    ? [maxX / 2, 8, maxZ + 4]
    : [maxX / 2, 12, maxZ + 8];

  return (
    <>
      <PerspectiveCamera 
        makeDefault 
        position={cameraPosition}
        fov={compact ? 50 : 45}
      />
      <OrbitControls 
        enablePan={!compact}
        enableZoom={!compact}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={compact ? 8 : 5}
        maxDistance={compact ? 20 : 50}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      {/* Environment */}
      <Environment preset="warehouse" />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[maxX / 2, -0.01, maxZ / 2]} receiveShadow>
        <planeGeometry args={[maxX + 10, maxZ + 10]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>

      {/* Grid helper */}
      <Grid 
        position={[maxX / 2, 0, maxZ / 2]}
        args={[maxX + 10, maxZ + 10]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#333355"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#444466"
        fadeDistance={50}
        fadeStrength={1}
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

  // Check for WebGL support
  if (typeof window !== 'undefined' && !hasWebGL) {
    return <WebGLFallback />;
  }

  const height = props.compact ? 'h-64' : 'h-[400px]';

  return (
    <div className={`relative ${height} w-full rounded-lg overflow-hidden border border-border bg-background`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          dpr={[1, 1.5]}
          frameloop="demand"
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
          <Scene {...props} />
        </Canvas>
      </Suspense>

      {/* Overlay legend */}
      <div className="absolute bottom-2 left-2 flex gap-2">
        {props.showThermal && (
          <div className="bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-xs flex items-center gap-2">
            <span className="text-muted-foreground">Thermal:</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-blue-500" /> Cool
              <span className="w-3 h-3 rounded-sm bg-amber-500 ml-1" /> Warm
              <span className="w-3 h-3 rounded-sm bg-red-500 ml-1" /> Hot
            </span>
          </div>
        )}
        {props.showPower && (
          <div className="bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-xs flex items-center gap-2">
            <span className="text-muted-foreground">Power:</span>
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
