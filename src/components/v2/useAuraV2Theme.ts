/**
 * AURA Visual System V2 — theme scope.
 * Adds the `aura-v2` class to <html> while the authenticated shell is
 * mounted so portalled overlays (dialogs, popovers, toasts) inherit the
 * same dark-first surfaces. Removed on unmount so public marketing and
 * auth routes keep their existing appearance. No behavioural change.
 */
import { useEffect } from 'react';

export const AURA_V2_CLASS = 'aura-v2';

export function useAuraV2Theme(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.add(AURA_V2_CLASS);
    return () => {
      root.classList.remove(AURA_V2_CLASS);
    };
  }, [enabled]);
}
