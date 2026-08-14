/**
 * Deterministic benchmark scene for the hardware GPU acceptance harness.
 *
 * The camera path is fixed, overlays are disabled except the scenario label,
 * and `preserveDrawingBuffer` is deliberately left off so the measurement is
 * not distorted. Screenshots are taken with the browser/platform mechanism
 * once each camera hold has settled.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Box3, Vector3, type Group } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Grid, PerspectiveCamera } from '@react-three/drei';
import { ApprovedRackAsset } from '@/components/twin-visualization/ApprovedRackAsset';
import type { RackVisual } from '@/components/twin-visualization/types';
import {
  createLongTaskRecorder,
  createWebglWarningRecorder,
  estimateGeometryMemoryMb,
  summariseFrames,
  type FrameStats,
  type SceneCounters,
  type StabilityReport,
  type TimingBreakdown,
} from './benchmark';
import type { SceneIntegrity } from './acceptance';
import { BENCHMARK_CONFIG, type AssetExpectation } from './spec';

export type BenchmarkPhase = 'idle' | 'stabilising' | 'front' | 'rear' | 'elevated' | 'complete';

export interface BenchmarkOutcome {
  frames: FrameStats;
  counters: SceneCounters;
  timings: TimingBreakdown;
  stability: StabilityReport;
  integrity: Omit<SceneIntegrity, 'visualClearanceConfirmed'>;
  canvas: HTMLCanvasElement | null;
}

const SCENARIO_RACK: RackVisual = {
  id: 'sim:rack:liquid-cooled-pilot-01',
  name: 'Proposed liquid-cooled rack (simulated)',
  rowId: 'sim:row:design-scenario',
  position: [0, 0, 0],
  heightU: 42,
  utilizationPercent: 0,
  powerKw: 0,
  thermalCelsius: 0,
  isCritical: false,
  isAffected: false,
  cooling: { liquidCooled: true, rearDoorHeatExchanger: true, chilledWaterConnected: false },
};

interface CameraKey {
  phase: Exclude<BenchmarkPhase, 'idle' | 'complete'>;
  position: [number, number, number];
  target: [number, number, number];
  untilMs: number;
}

const STAB = BENCHMARK_CONFIG.stabilizationMs;
const ORBIT = BENCHMARK_CONFIG.orbitMs;

/** Fixed path: stabilise, then equal front / rear / elevated holds. */
const PATH: CameraKey[] = [
  { phase: 'stabilising', position: [0, 1.7, 4.6], target: [0, 1.6, 0], untilMs: STAB },
  { phase: 'front', position: [0, 1.7, 4.6], target: [0, 1.6, 0], untilMs: STAB + ORBIT / 3 },
  { phase: 'rear', position: [0, 1.7, -4.6], target: [0, 1.6, 0], untilMs: STAB + (2 * ORBIT) / 3 },
  { phase: 'elevated', position: [3.4, 4.6, 3.4], target: [0, 2.2, 0], untilMs: STAB + ORBIT },
];

function phaseAt(elapsed: number): CameraKey {
  return PATH.find((key) => elapsed < key.untilMs) ?? PATH[PATH.length - 1];
}

function Runner({
  expected,
  running,
  onPhase,
  onComplete,
  transferMs,
}: {
  expected: AssetExpectation;
  running: boolean;
  onPhase: (phase: BenchmarkPhase) => void;
  onComplete: (outcome: BenchmarkOutcome) => void;
  transferMs: number | null;
}) {
  const { camera, gl, scene } = useThree();
  const startedAt = useRef<number | null>(null);
  const frameTimes = useRef<number[]>([]);
  const lastFrame = useRef<number>(0);
  const firstAssetFrame = useRef<number | null>(null);
  const recorders = useRef<{
    longTask: ReturnType<typeof createLongTaskRecorder>;
    warnings: ReturnType<typeof createWebglWarningRecorder>;
  } | null>(null);
  const contextLoss = useRef(0);
  const peakCalls = useRef(0);
  const currentPhase = useRef<BenchmarkPhase>('idle');
  const finished = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = () => {
      contextLoss.current += 1;
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => canvas.removeEventListener('webglcontextlost', onLost);
  }, [gl]);

  useEffect(() => {
    if (!running) return;
    finished.current = false;
    startedAt.current = null;
    frameTimes.current = [];
    firstAssetFrame.current = null;
    peakCalls.current = 0;
    contextLoss.current = 0;
    recorders.current = {
      longTask: createLongTaskRecorder(),
      warnings: createWebglWarningRecorder(),
    };
  }, [running]);

  useFrame(() => {
    if (!running || finished.current) return;
    const now = performance.now();
    if (startedAt.current === null) {
      startedAt.current = now;
      lastFrame.current = now;
      return;
    }
    const elapsed = now - startedAt.current;
    const delta = now - lastFrame.current;
    lastFrame.current = now;

    const key = phaseAt(elapsed);
    camera.position.set(...key.position);
    camera.lookAt(...key.target);
    if (key.phase !== currentPhase.current) {
      currentPhase.current = key.phase;
      onPhase(key.phase);
    }

    const assetGroup = scene.getObjectByName(`ApprovedRackAsset:${SCENARIO_RACK.id}`);
    if (assetGroup && firstAssetFrame.current === null) firstAssetFrame.current = elapsed;

    peakCalls.current = Math.max(peakCalls.current, gl.info.render.calls);
    // Measurement window excludes the stabilisation phase.
    if (elapsed >= STAB) frameTimes.current.push(delta);

    if (elapsed >= STAB + ORBIT) {
      finished.current = true;
      let assetDrawCalls = 0;
      let instances = 0;
      let procedural = false;
      const box = new Box3();
      let hasBounds = false;

      scene.traverse((object) => {
        if (object.name.startsWith('ApprovedRackAsset:')) {
          instances += 1;
          object.traverse((child) => {
            if ((child as unknown as { isMesh?: boolean }).isMesh) assetDrawCalls += 1;
          });
          box.setFromObject(object);
          hasBounds = true;
        }
        if (object.name.startsWith('rack:')) procedural = true;
      });

      const size = hasBounds ? box.getSize(new Vector3()) : null;
      const round = (v: number) => Number(v.toFixed(4));
      const geometryCount = gl.info.memory.geometries;
      const triangles = gl.info.render.triangles;

      onPhase('complete');
      onComplete({
        frames: summariseFrames(frameTimes.current),
        counters: {
          totalDrawCalls: peakCalls.current,
          assetDrawCalls,
          renderedTriangles: triangles,
          geometryCount,
          rendererTextureCount: gl.info.memory.textures,
          estimatedGeometryMemoryMb: estimateGeometryMemoryMb(expected.triangleCount, geometryCount),
        },
        timings: {
          cdnTransferMs: transferMs,
          parseMs: null,
          mountMs: null,
          firstAssetFrameMs: firstAssetFrame.current,
          warmCacheMountMs: null,
        },
        stability: {
          longTasks: recorders.current?.longTask.stop() ?? { count: 0, longestMs: 0 },
          webglWarnings: recorders.current?.warnings.stop() ?? [],
          contextLossEvents: contextLoss.current,
        },
        integrity: {
          assetInstanceCount: instances,
          proceduralFallbackMounted: procedural,
          measuredBounds: size ? { x: round(size.x), y: round(size.y), z: round(size.z) } : null,
          measuredMinY: hasBounds ? round(box.min.y) : null,
        },
        canvas: gl.domElement,
      });
    }
  });

  return null;
}

export function BenchmarkScene({
  expected,
  running,
  transferMs,
  onPhase,
  onComplete,
}: {
  expected: AssetExpectation;
  running: boolean;
  transferMs: number | null;
  onPhase: (phase: BenchmarkPhase) => void;
  onComplete: (outcome: BenchmarkOutcome) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const groupRef = useRef<Group>(null);
  const aspect = useMemo(
    () => BENCHMARK_CONFIG.viewport.width / BENCHMARK_CONFIG.viewport.height,
    [],
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-border bg-slate-950"
      style={{ aspectRatio: `${aspect}` }}
      data-testid="gpu-benchmark-canvas"
      data-benchmark-running={running ? 'true' : 'false'}
    >
      <Canvas
        shadows={false}
        dpr={BENCHMARK_CONFIG.devicePixelRatioCap}
        gl={{
          antialias: true,
          powerPreference: BENCHMARK_CONFIG.powerPreference,
          preserveDrawingBuffer: BENCHMARK_CONFIG.preserveDrawingBuffer,
        }}
        onCreated={() => setMounted(true)}
      >
        <PerspectiveCamera makeDefault position={[0, 1.7, 4.6]} fov={40} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 4]} intensity={1.1} />
        <directionalLight position={[-4, 3, -4]} intensity={0.4} />
        <Grid args={[24, 24]} cellColor="#334155" sectionColor="#475569" infiniteGrid fadeDistance={30} />
        <Environment preset="warehouse" />
        <Suspense fallback={null}>
          <group ref={groupRef}>
            <ApprovedRackAsset
              rack={SCENARIO_RACK}
              assetId={expected.assetId}
              showThermal={false}
              overlayColor={null}
            />
          </group>
        </Suspense>
        <Runner
          expected={expected}
          running={running && mounted}
          onPhase={onPhase}
          onComplete={onComplete}
          transferMs={transferMs}
        />
      </Canvas>
      {/* Only overlay permitted during the benchmark: the scenario label. */}
      <div
        className="pointer-events-none absolute left-3 top-3 rounded border border-amber-400/70 bg-slate-900/90 px-2 py-1 text-[11px] font-medium text-amber-300"
        data-testid="benchmark-scenario-label"
      >
        {BENCHMARK_CONFIG.scenarioId} - simulated design, not commissioned
      </div>
    </div>
  );
}