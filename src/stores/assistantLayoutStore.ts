/**
 * AURA Assistant layout state.
 *
 * The assistant supports the workspace, so its presentation is a layout
 * concern shared by the shell (which reflows) and the panel itself.
 */
import { useEffect, useState } from 'react';
import { create } from 'zustand';

export const ASSISTANT_MIN_WIDTH = 360;
export const ASSISTANT_MAX_WIDTH = 520;
export const ASSISTANT_DEFAULT_WIDTH = 400;
/** At or above this width the assistant docks and reflows the workspace. */
export const ASSISTANT_DOCK_BREAKPOINT = 1200;

const WIDTH_KEY = 'aura.assistant.width';

function readStoredWidth(): number {
  if (typeof window === 'undefined') return ASSISTANT_DEFAULT_WIDTH;
  const raw = Number(window.localStorage.getItem(WIDTH_KEY));
  if (!Number.isFinite(raw) || raw <= 0) return ASSISTANT_DEFAULT_WIDTH;
  return Math.min(ASSISTANT_MAX_WIDTH, Math.max(ASSISTANT_MIN_WIDTH, raw));
}

interface AssistantLayoutState {
  width: number;
  setWidth: (width: number) => void;
}

export const useAssistantLayoutStore = create<AssistantLayoutState>((set) => ({
  width: readStoredWidth(),
  setWidth: (width) => {
    const clamped = Math.min(ASSISTANT_MAX_WIDTH, Math.max(ASSISTANT_MIN_WIDTH, Math.round(width)));
    if (typeof window !== 'undefined') window.localStorage.setItem(WIDTH_KEY, String(clamped));
    set({ width: clamped });
  },
}));

/** Viewport mode the assistant should present in. */
export type AssistantPresentation = 'docked' | 'overlay' | 'fullscreen';

export function useAssistantPresentation(): AssistantPresentation {
  const [mode, setMode] = useState<AssistantPresentation>(() => resolve());

  useEffect(() => {
    const onResize = () => setMode(resolve());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return mode;
}

function resolve(): AssistantPresentation {
  if (typeof window === 'undefined') return 'docked';
  if (window.innerWidth >= ASSISTANT_DOCK_BREAKPOINT) return 'docked';
  if (window.innerWidth >= 640) return 'overlay';
  return 'fullscreen';
}