/**
 * Shell layout flags. Full-bleed lets a page opt out of the centred, padded
 * content container so it can own the whole viewport width.
 */
import { create } from 'zustand';

interface ShellLayoutState {
  fullBleed: boolean;
  setFullBleed: (fullBleed: boolean) => void;
  /**
   * A page can take ownership of the operating-state truth line and surface it
   * inside its own record header. The shell suppresses its copy so assistive
   * technology does not receive duplicate or cross-route state either.
   */
  pageOwnsOperatingState: boolean;
  setPageOwnsOperatingState: (owns: boolean) => void;
}

export const useShellLayoutStore = create<ShellLayoutState>((set) => ({
  fullBleed: false,
  setFullBleed: (fullBleed) => set({ fullBleed }),
  pageOwnsOperatingState: false,
  setPageOwnsOperatingState: (pageOwnsOperatingState) => set({ pageOwnsOperatingState }),
}));
