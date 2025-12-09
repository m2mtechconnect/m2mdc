import { useEffect, useRef } from 'react';
import { useBuilderStore } from '@/stores/builderStore';
import { useToast } from '@/hooks/use-toast';

/**
 * Auto-save hook with 500ms debounce
 * Automatically saves builder state to Supabase when changes are detected
 */
export function useBuilderAutosave() {
  const { toast } = useToast();
  const isDirty = useBuilderStore((state) => state.isDirty);
  const save = useBuilderStore((state) => state.save);
  const systemName = useBuilderStore((state) => state.state.systemName);
  const department = useBuilderStore((state) => state.state.department);
  
  const saveTimerRef = useRef<NodeJS.Timeout>();
  const hasShownErrorRef = useRef(false);

  useEffect(() => {
    // Only autosave if we have minimal required data (either name OR department)
    if (!isDirty || (!systemName && !department)) {
      return;
    }

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer with 500ms debounce
    saveTimerRef.current = setTimeout(async () => {
      try {
        await save();
        hasShownErrorRef.current = false; // Reset error flag on successful save
      } catch (error) {
        // Only show error toast once per session to avoid spam
        if (!hasShownErrorRef.current) {
          console.error('Autosave failed:', error);
          
          // Extract detailed error message
          let errorDescription = 'Failed to save changes';
          if (error instanceof Error) {
            errorDescription = error.message;
          } else if (typeof error === 'object' && error !== null) {
            errorDescription = (error as any).message || String(error);
          }
          
          toast({
            title: 'Autosave failed',
            description: errorDescription,
            variant: 'destructive',
          });
          hasShownErrorRef.current = true;
        }
      }
    }, 500);

    // Cleanup timer on unmount
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [isDirty, save, systemName, department, toast]);

  // Manual save with user feedback
  const manualSave = async () => {
    try {
      await save();
      toast({
        title: 'Progress saved',
        description: 'Your changes have been saved successfully',
      });
      return true;
    } catch (error) {
      console.error('Manual save failed:', error);
      
      // Extract detailed error message
      let errorDescription = 'Failed to save changes';
      if (error instanceof Error) {
        errorDescription = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorDescription = (error as any).message || String(error);
      }
      
      toast({
        title: 'Save failed',
        description: errorDescription,
        variant: 'destructive',
      });
      return false;
    }
  };

  return { manualSave };
}
