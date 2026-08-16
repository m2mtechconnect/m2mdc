/**
 * Deterministic capture views for the cloud-GPU realism comparison.
 *
 * Both realism modes are captured with identical camera matrices, viewport
 * and quality, so the only variable between a paired image set is the
 * material presentation. Every view maps to an existing camera preset - no
 * new camera behaviour is introduced for validation.
 */

import type { CameraPresetId } from '@/three/cameraPresets';
import type { DistanceBand } from '@/components/twin-visualization/assetRegistry';

export interface ValidationView {
  id: string;
  label: string;
  preset: CameraPresetId;
  band: DistanceBand;
  /** Overlay layers that must be active for the capture; empty = physical only. */
  overlays: string[];
  /** Milliseconds to settle before the screenshot is taken. */
  settleMs: number;
}

export const CAPTURE_VIEWPORT = { width: 1920, height: 1080 } as const;
export const CAPTURE_DEVICE_PIXEL_RATIO = 1;
export const BENCHMARK_DURATION_MS = 35_000;

export const VALIDATION_VIEWS: ValidationView[] = [
  { id: 'facility-overview', label: 'Facility overview', preset: 'fitFacility', band: 'overview', overlays: [], settleMs: 2500 },
  { id: 'nearby-rack-row', label: 'Nearby rack row', preset: 'frontAisles', band: 'nearby', overlays: [], settleMs: 2000 },
  { id: 'selected-rack-front', label: 'Selected rack front', preset: 'rackFront', band: 'selected', overlays: [], settleMs: 2000 },
  { id: 'selected-rack-rear', label: 'Selected rack rear', preset: 'rackRear', band: 'selected', overlays: [], settleMs: 2000 },
  { id: 'server-faceplates', label: 'Server faceplates', preset: 'fitSelection', band: 'selected', overlays: [], settleMs: 2000 },
  { id: 'network-switch', label: 'Network switch', preset: 'fitSelection', band: 'selected', overlays: [], settleMs: 2000 },
  { id: 'rack-pdu', label: 'Rack PDU', preset: 'rackRear', band: 'selected', overlays: [], settleMs: 2000 },
  { id: 'cable-tray-clearance', label: 'Cable-tray clearance', preset: 'rearInfrastructure', band: 'nearby', overlays: [], settleMs: 2000 },
  { id: 'luminaires', label: 'Luminaires', preset: 'rackElevated', band: 'nearby', overlays: [], settleMs: 2000 },
  { id: 'localized-thermal', label: 'Localized thermal', preset: 'coolingTopology', band: 'nearby', overlays: ['thermal'], settleMs: 2500 },
];

/** Stable capture filename for one mode/view pair. */
export function captureFileName(mode: string, viewId: string) {
  return `${viewId}__${mode}.png`;
}