import { useState, useCallback } from 'react';
import { useBuilderStore } from '@/stores/builderStore';
import { useToast } from '@/hooks/use-toast';

interface HistoryEntry {
  state: any;
  timestamp: number;
  description: string;
}

const MAX_HISTORY = 50;

export const useBuilderHistory = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const { toast } = useToast();
  const setState = useBuilderStore((state) => state.setState);
  const currentState = useBuilderStore((state) => state.state);

  const addToHistory = useCallback((description: string) => {
    // Use structuredClone for better deep cloning (handles circular refs better)
    let clonedState;
    try {
      clonedState = structuredClone(currentState);
    } catch {
      // Fallback to JSON method if structuredClone fails
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

    setHistory((prev) => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(entry);
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });

    setCurrentIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [currentState, currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex <= 0) {
      toast({
        title: "Nothing to undo",
        description: "You're at the beginning of history",
      });
      return;
    }

    const newIndex = currentIndex - 1;
    const entry = history[newIndex];
    
    setState(entry.state);
    setCurrentIndex(newIndex);
    
    toast({
      title: "Undone",
      description: entry.description,
    });
  }, [currentIndex, history, setState, toast]);

  const redo = useCallback(() => {
    if (currentIndex >= history.length - 1) {
      toast({
        title: "Nothing to redo",
        description: "You're at the latest version",
      });
      return;
    }

    const newIndex = currentIndex + 1;
    const entry = history[newIndex];
    
    setState(entry.state);
    setCurrentIndex(newIndex);
    
    toast({
      title: "Redone",
      description: entry.description,
    });
  }, [currentIndex, history, setState, toast]);

  const canUndo = currentIndex > 0;
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
