import { useEffect, useRef } from 'react';

/**
 * Restores keyboard focus to the control that opened a controlled overlay.
 *
 * Radix restores focus automatically only when the overlay is opened through
 * its own Trigger. Overlays driven by URL state or external buttons have no
 * trigger, so focus lands on <body> after close, breaking focus order
 * (WCAG 2.4.3). This hook records the active element when the overlay opens
 * and returns focus to it when the overlay closes.
 *
 * Pass the returned handler to `onCloseAutoFocus` so the restore wins over
 * Radix's own default behaviour.
 */
export function useReturnFocus(open: boolean) {
  const previousRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      const active = document.activeElement;
      previousRef.current = active instanceof HTMLElement ? active : null;
    }
  }, [open]);

  return (event: Event) => {
    const previous = previousRef.current;
    if (previous && document.contains(previous)) {
      event.preventDefault();
      previous.focus();
    }
    previousRef.current = null;
  };
}
