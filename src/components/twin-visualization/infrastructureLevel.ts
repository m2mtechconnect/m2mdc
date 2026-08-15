/**
 * Infrastructure visibility is a first-class scene control, not a side effect
 * of the facility shell.
 *
 *  off        no trays, pipes, busways or overhead structure. Lighting stays.
 *  essential  approved cable trays and operationally important infrastructure;
 *             obstructing structural beams stay hidden. Default for rack views.
 *  full       all available reference infrastructure, framed from above.
 *
 * Thick structural beams are never restored: they occluded the racks the
 * operator is inspecting.
 */
import type { ShellMode } from './DataHall';

export type InfrastructureLevel = 'off' | 'essential' | 'full';

export const INFRASTRUCTURE_LEVELS: Array<{
  id: InfrastructureLevel;
  label: string;
  description: string;
}> = [
  { id: 'off', label: 'Off', description: 'Racks only. Lighting retained, overhead structure hidden.' },
  {
    id: 'essential',
    label: 'Essential',
    description: 'Approved NVIDIA cable trays and operational infrastructure. Structural beams hidden.',
  },
  { id: 'full', label: 'Full', description: 'All available reference infrastructure, elevated framing.' },
];

export const DEFAULT_INFRASTRUCTURE: InfrastructureLevel = 'essential';

export function isInfrastructureLevel(v: unknown): v is InfrastructureLevel {
  return v === 'off' || v === 'essential' || v === 'full';
}

/** Facility shell the level implies when the operator has not overridden it. */
export function shellModeForInfrastructure(level: InfrastructureLevel): ShellMode {
  if (level === 'off') return 'off';
  if (level === 'full') return 'full';
  return 'cutaway';
}
