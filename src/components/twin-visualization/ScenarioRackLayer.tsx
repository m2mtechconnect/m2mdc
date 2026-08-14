/**
 * Scenario rack layer.
 *
 * Renders the SIMULATED design-scenario rack using the approved operations
 * derivative. The rack is visually distinct from commissioned equipment:
 * an amber scenario footprint, an amber outline and a persistent
 * "Simulated design" label. No telemetry overlay is ever applied to it,
 * because no measurement exists for a rack that is not built.
 */

import { Html } from '@react-three/drei';
import { ApprovedRackAsset } from './ApprovedRackAsset';
import type { DesignScenario } from './designScenario';
import type { RackVisual } from './types';

interface ScenarioRackLayerProps {
  scenario: DesignScenario;
  rack: RackVisual;
  selected?: boolean;
  showLabels?: boolean;
  onRackClick?: (rackId: string) => void;
  /** Reported when the approved derivative fails to load at runtime. */
  onDerivativeFailure?: (reason: string) => void;
}

export function ScenarioRackLayer({
  scenario,
  rack,
  selected,
  showLabels,
  onRackClick,
  onDerivativeFailure,
}: ScenarioRackLayerProps) {
  const [x, , z] = rack.position;

  return (
    <group name={`scenario:${scenario.id}`} userData={{ scenarioId: scenario.id, simulated: true }}>
      {/* Scenario footprint: amber, never used by as-built equipment. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, z]} renderOrder={2}>
        <ringGeometry args={[0.95, 1.12, 48]} />
        <meshBasicMaterial color="#FFCC00" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* Amber locator beam: makes the proposed rack findable in a hall of
          identical procedural cabinets without recolouring any other rack. */}
      <mesh position={[x, 2.6, z]} renderOrder={2}>
        <cylinderGeometry args={[0.045, 0.045, 5.2, 12]} />
        <meshBasicMaterial color="#FFCC00" transparent opacity={0.32} depthWrite={false} />
      </mesh>

      <ApprovedRackAsset
        rack={rack}
        assetId={scenario.assetId}
        showThermal={false}
        selected={selected}
        overlayColor={null}
        onClick={onRackClick}
        onDerivativeFailure={onDerivativeFailure}
      />

      {showLabels !== false && (
        <Html position={[x, 3.35, z]} center distanceFactor={14} zIndexRange={[20, 0]}>
          <div
            data-testid="scenario-rack-label"
            className="whitespace-nowrap rounded border border-amber-400/70 bg-slate-900/90 px-2 py-1 text-[11px] font-medium text-amber-300"
          >
            Simulated design - not commissioned
          </div>
        </Html>
      )}
    </group>
  );
}
