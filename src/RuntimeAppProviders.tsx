import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { boundedRetryDelay, retryUnlessTerminal } from '@/lib/queryRetry';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: retryUnlessTerminal,
      retryDelay: boundedRetryDelay,
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

/** Heavy runtime-only providers intentionally excluded from the bare landing route. */
export default function RuntimeAppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
