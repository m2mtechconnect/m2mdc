/**
 * Defers mounting a WebGL scene until the operator chrome is interactive.
 *
 * Measured on the truth harness: mounting the facility scene during the same
 * commit as the Data Centre Twin page cost a single 4.4s long task (three.js
 * shader program compilation, `onFirstUse`) plus ~8s of follow-on renderer
 * work, so the domain tabs above the scene did not respond to a click for
 * ~14s after navigation.
 *
 * The scene is not the first thing an operator reads, so it now mounts after
 * the browser reports idle (or after a hard cap, so a permanently busy tab
 * still gets its scene) and only when the container is on screen. Deep links
 * that target the scene still resolve: the delay is one idle callback, not a
 * user gesture.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface DeferredSceneMountProps {
  children: ReactNode;
  /** Reserved space so deferring the scene does not shift the layout. */
  fallback: ReactNode;
  /** Hard cap in ms; the scene mounts even if the tab never goes idle. */
  maxDelayMs?: number;
}

export function DeferredSceneMount({ children, fallback, maxDelayMs = 1200 }: DeferredSceneMountProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    const commit = () => {
      if (!cancelled) setReady(true);
    };

    // Never defer when the environment cannot report idleness.
    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    let idleHandle: number | undefined;
    const timer = window.setTimeout(commit, maxDelayMs);

    const schedule = () => {
      if (typeof idleWindow.requestIdleCallback === 'function') {
        idleHandle = idleWindow.requestIdleCallback(commit, { timeout: maxDelayMs });
      } else {
        window.setTimeout(commit, 0);
      }
    };

    const element = containerRef.current;
    // Off-screen scenes wait for the operator to scroll to them.
    if (element && typeof IntersectionObserver === 'function') {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          schedule();
        }
      });
      observer.observe(element);
      return () => {
        cancelled = true;
        observer.disconnect();
        window.clearTimeout(timer);
        if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      };
    }

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
    };
  }, [ready, maxDelayMs]);

  return (
    <div ref={containerRef} data-scene-mount={ready ? 'mounted' : 'deferred'}>
      {ready ? children : fallback}
    </div>
  );
}

export default DeferredSceneMount;
