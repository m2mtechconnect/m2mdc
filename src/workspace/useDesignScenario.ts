/**
 * Design-scenario selection for the Simulation workspace.
 *
 * The URL is the single source of truth: the panel selection, the mounted
 * scene and the address bar can never disagree, and browser back/forward or a
 * refresh restore the same state. An unknown id fails closed (nothing mounts).
 */
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DESIGN_SCENARIO_PARAM,
  resolveDesignScenarioById,
  type DesignScenario,
} from '@/components/twin-visualization/designScenario';

export interface DesignScenarioSelection {
  /** Raw id in the URL, whether or not it resolves. */
  requestedId: string | null;
  /** Resolved scenario, or null when absent/unknown. */
  scenario: DesignScenario | null;
  /** True when a proposed design is selected and mounted. */
  active: boolean;
  /** Select a proposed design, or pass null to return to operations. */
  selectDesign: (id: string | null) => void;
}

export function useDesignScenario(): DesignScenarioSelection {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get(DESIGN_SCENARIO_PARAM);
  const scenario = resolveDesignScenarioById(requestedId);

  const selectDesign = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set(DESIGN_SCENARIO_PARAM, id);
      else next.delete(DESIGN_SCENARIO_PARAM);
      // A push entry so browser back/forward restores the previous selection.
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  return { requestedId, scenario, active: scenario !== null, selectDesign };
}
