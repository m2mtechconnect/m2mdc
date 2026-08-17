import { useState, useCallback, useRef } from 'react';
import { useBuilderStore } from '@/stores/builderStore';
import { useToast } from '@/hooks/use-toast';

interface HistoryEntry {
  state: any;
  timestamp: number;
  description: string;
}

const MAX_HISTORY = 50;

/**
 * Undo/redo history for the builder.
 *
 * The cursor is tracked in a ref as well as in state: several history
 * operations can run in one React batch (a loop of edits, or two undo clicks
 * before a re-render), and reading the cursor from state alone made those
 * later calls reuse a stale index, which truncated history and silently
 * dropped undo steps.
 */
export const useBuilderHistory = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const indexRef = useRef(-1);
  const historyRef = useRef<HistoryEntry[]>([]);
  const { toast } = useToast();
  const setState = useBuilderStore((state) => state.setState);
  const currentState = useBuilderStore((state) => state.state);

  const commitIndex = useCallback((next: number) => {
    indexRef.current = next;
    setCurrentIndex(next);
  }, []);

  const commitHistory = useCallback((next: HistoryEntry[]) => {
    historyRef.current = next;
    setHistory(next);
  }, []);

  const addToHistory = useCallback(
    (description: string) => {
      let clonedState;
      try {
        clonedState = structuredClone(currentState);
      } catch {
        // Fallback to JSON when structuredClone cannot handle the value
        try {
          clonedState = JSON.parse(JSON.stringify(currentState));
        } catch {
          console.error('Failed to clone state for history');
          return;
        }
      }

      const entry: HistoryEntry = {
        state: clonedState,
        timestamp: Date.now(),
        description,
      };

      // Drop any redo branch, then append and cap the length.
      const next = historyRef.current.slice(0, indexRef.current + 1);
      next.push(entry);
      if (next.length > MAX_HISTORY) {
        next.splice(0, next.length - MAX_HISTORY);
      }

      commitHistory(next);
      commitIndex(next.length - 1);
    },
    [currentState, commitHistory, commitIndex]
  );

  const undo = useCallback(() => {
    if (indexRef.current < 0 || historyRef.current.length === 0) {
      toast({
        title: 'Nothing to undo',
        description: "You're at the beginning of history",
      });
      return;
    }

    const newIndex = indexRef.current - 1;
    const entry = historyRef.current[Math.max(newIndex, 0)];

    setState(entry.state);
    commitIndex(newIndex);

    toast({
      title: 'Undone',
      description: entry.description,
    });
  }, [setState, toast, commitIndex]);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) {
      toast({
        title: 'Nothing to redo',
        description: "You're at the latest version",
      });
      return;
    }

    const newIndex = indexRef.current + 1;
    const entry = historyRef.current[newIndex];

    setState(entry.state);
    commitIndex(newIndex);

    toast({
      title: 'Redone',
      description: entry.description,
    });
  }, [setState, toast, commitIndex]);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength: history.length,
  };
};
