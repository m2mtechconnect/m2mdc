/**
 * AURA-authored facility derivative state.
 *
 * `AuraFacilityLayer` records what actually mounted here; `DataHall` reads it
 * to suppress the procedural stand-in for exactly the families that mounted.
 * Suppression is never inferred from the manifest: a family that is still
 * loading, or that failed, keeps its procedural geometry so the hall is never
 * missing a floor or a wall.
 */
import { create } from 'zustand';

export type FacilityFamily =
  | 'raised-floor-tile'
  | 'perforated-floor-tile'
  | 'data-hall-luminaire'
  | 'structural-column'
  | 'facility-shell';

export type FacilityFamilyState = 'idle' | 'loading' | 'mounted' | 'fallback';

interface FacilityDerivativeState {
  families: Record<FacilityFamily, FacilityFamilyState>;
  setFamily: (family: FacilityFamily, state: FacilityFamilyState) => void;
  resetFamilies: () => void;
}

const IDLE: Record<FacilityFamily, FacilityFamilyState> = {
  'raised-floor-tile': 'idle',
  'perforated-floor-tile': 'idle',
  'data-hall-luminaire': 'idle',
  'structural-column': 'idle',
  'facility-shell': 'idle',
};

export const useFacilityDerivativeStore = create<FacilityDerivativeState>((set) => ({
  families: { ...IDLE },
  setFamily: (family, state) =>
    set((s) =>
      s.families[family] === state
        ? s
        : { families: { ...s.families, [family]: state } },
    ),
  resetFamilies: () => set({ families: { ...IDLE } }),
}));

declare global {
  interface Window {
    /** Runtime evidence surface for the facility regression harness. */
    __auraFacilityFamilies?: () => Record<FacilityFamily, FacilityFamilyState>;
  }
}

if (typeof window !== 'undefined') {
  window.__auraFacilityFamilies = () => ({ ...useFacilityDerivativeStore.getState().families });
}

/** True only once the derivative for a family is mounted in the live scene. */
export function familyMounted(
  families: Record<FacilityFamily, FacilityFamilyState>,
  family: FacilityFamily,
): boolean {
  return families[family] === 'mounted';
}
