/**
 * Canvas safe-zone arbitration.
 *
 * Floating chrome that can extend outside its own container (KPI evidence
 * tooltips rise over the bottom of the model canvas) announces itself here.
 * The canvas legend yields its bottom-left zone while that is true, so two
 * layers of information can never sit on top of each other.
 */
import { create } from 'zustand';

interface CanvasFocusState {
  /** True while a KPI evidence tooltip is open above the KPI strip. */
  kpiTooltipOpen: boolean;
  setKpiTooltipOpen: (open: boolean) => void;
}

export const useCanvasFocusStore = create<CanvasFocusState>((set) => ({
  kpiTooltipOpen: false,
  setKpiTooltipOpen: (kpiTooltipOpen) => set({ kpiTooltipOpen }),
}));
