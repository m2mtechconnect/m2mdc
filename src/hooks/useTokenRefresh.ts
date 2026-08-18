import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to automatically refresh expiring tokens in the background
 * Checks every 5 minutes for tokens expiring in the next 15 minutes
 */
export function useTokenRefresh() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // eslint-disable-next-line prefer-const -- read by the cleanup closure before assignment
    let intervalId: NodeJS.Timeout;

    const refreshTokens = async () => {
      try {
        console.log('Running automatic token refresh check...');

        const { data, error } = await supabase.functions.invoke('zapier-auto-refresh');

        if (error) {
          console.error('Auto-refresh error:', error);
          return;
        }

        if (data?.successful > 0) {
          console.log(`Successfully refreshed ${data.successful} tokens`);
          
          // Invalidate related queries to reflect updated status
          queryClient.invalidateQueries({ queryKey: ['zapier-status'] });
          queryClient.invalidateQueries({ queryKey: ['zapier-status-badge'] });
        }

        if (data?.failed > 0) {
          console.warn(`Failed to refresh ${data.failed} tokens`);
          
          // Show toast for failed refreshes
          toast({
            title: 'Some connections need re-authentication',
            description: `${data.failed} connection(s) could not be refreshed automatically.`,
            variant: 'destructive',
          });

          // Invalidate queries to show expired status
          queryClient.invalidateQueries({ queryKey: ['zapier-status'] });
          queryClient.invalidateQueries({ queryKey: ['zapier-status-badge'] });
        }
      } catch (err) {
        console.error('Token refresh check failed:', err);
      }
    };

    // Run immediately on mount
    refreshTokens();

    // Then run every 5 minutes
    intervalId = setInterval(refreshTokens, 5 * 60 * 1000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [queryClient, toast]);
}

/**
 * Hook to manually refresh a specific connection token
 */
export function useManualTokenRefresh() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshToken = async (connectionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('zapier-refresh-token', {
        body: { connectionId },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || 'Refresh failed');
      }

      toast({
        title: 'Token refreshed',
        description: 'Connection has been renewed successfully.',
      });

      // Invalidate queries to reflect updated status
      queryClient.invalidateQueries({ queryKey: ['zapier-status'] });
      queryClient.invalidateQueries({ queryKey: ['zapier-status-badge'] });

      return data;
    } catch (err) {
      toast({
        title: 'Refresh failed',
        description: err instanceof Error ? err.message : 'Failed to refresh token',
        variant: 'destructive',
      });
      throw err;
    }
  };

  return { refreshToken };
}