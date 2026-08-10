/**
 * Shell layout flags. Full-bleed lets a page opt out of the centred, padded
 * content container so it can own the whole viewport width.
 */
import { create } from 'zustand';

interface ShellLayoutState {
  fullBleed: boolean;
  setFullBleed: (fullBleed: boolean) => void;
}

export const useShellLayoutStore = create<ShellLayoutState>((set) => ({
  fullBleed: false,
  setFullBleed: (fullBleed) => set({ fullBleed }),
}));