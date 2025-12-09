import { supabase } from "@/integrations/supabase/client";
import { retryWithBackoff } from "./retry";

/**
 * Unified API client with retry logic for all backend calls
 */

interface InvokeOptions {
  functionName: string;
  body?: any;
  retryOptions?: {
    maxRetries?: number;
    onRetry?: (attempt: number, error: Error) => void;
  };
}

/**
 * Invoke Supabase edge function with automatic retry on transient failures
 * Handles both standardized REST envelope and legacy responses
 */
export async function invokeWithRetry<T = any>({
  functionName,
  body,
  retryOptions = {},
}: InvokeOptions): Promise<{ data: T | null; error: Error | null }> {
  try {
    const result = await retryWithBackoff(
      async () => {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body,
        });

        // Throw on error to trigger retry
        if (error) {
          throw error;
        }

        // Handle standardized REST envelope if present
        if (data && typeof data === 'object' && 'success' in data && 'correlationId' in data) {
          const response = data as { success: boolean; data: T | null; error: { message: string; code?: string; details?: unknown } | null; correlationId: string };
          
          if (!response.success) {
            throw {
              message: response.error?.message || 'Request failed',
              code: response.error?.code,
              details: response.error?.details,
              correlationId: response.correlationId,
            };
          }
          
          if (response.data === null || response.data === undefined) {
            throw new Error('API returned null data despite success status');
          }
          
          return { data: response.data, error: null };
        }

        // Legacy: return data as-is for functions not yet migrated
        return { data, error: null };
      },
      {
        maxRetries: retryOptions.maxRetries || 3,
        onRetry: retryOptions.onRetry,
      }
    );

    return result;
  } catch (error) {
    console.error(`[apiClient] ${functionName} failed after retries:`, error);
    return { data: null, error: error as Error };
  }
}

/**
 * Query Supabase table with retry
 */
export async function queryWithRetry<T = any>(
  tableName: string,
  query: (builder: any) => Promise<any>,
  retryOptions?: { maxRetries?: number }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const result = await retryWithBackoff(
      async () => {
        const builder = (supabase as any).from(tableName);
        const { data, error } = await query(builder);

        if (error) {
          throw error;
        }

        return { data, error: null };
      },
      {
        maxRetries: retryOptions?.maxRetries || 3,
      }
    );

    return result;
  } catch (error) {
    console.error(`[apiClient] Query ${tableName} failed:`, error);
    return { data: null, error: error as Error };
  }
}

/**
 * Common API operations with retry built-in
 */
export const api = {
  // Marketplace
  async loadTemplates() {
    return invokeWithRetry({
      functionName: 'templates-list',
    });
  },

  async loadMcpServers(params?: { page?: number; limit?: number; q?: string }) {
    return invokeWithRetry({
      functionName: 'arcade-servers',
      body: params,
    });
  },

  // Integrations
  async connectZapier(provider: string, config: any) {
    return invokeWithRetry({
      functionName: 'integrations-zapier',
      body: { action: 'connect', provider, ...config },
    });
  },

  async disconnectIntegration(provider: string) {
    return invokeWithRetry({
      functionName: 'integrations-zapier',
      body: { action: 'disconnect', provider },
    });
  },

  // RAG
  async uploadRagFile(systemId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('system_id', systemId);

    return invokeWithRetry({
      functionName: 'rag-upload',
      body: formData,
    });
  },

  async indexUrls(systemId: string, urls: string[]) {
    return invokeWithRetry({
      functionName: 'rag-urls',
      body: { system_id: systemId, urls },
    });
  },

  // Deployment
  async deploySystem(systemId: string, config: any) {
    return invokeWithRetry({
      functionName: 'systems-create',
      body: { system_id: systemId, ...config },
      retryOptions: {
        maxRetries: 5, // More retries for critical deployment
        onRetry: (attempt, error) => {
          console.warn(`Deployment retry ${attempt}/5:`, error.message);
        },
      },
    });
  },

  // Analytics
  async getAnalytics(systemId: string, dateRange: { from: string; to: string }) {
    return invokeWithRetry({
      functionName: 'analytics-systems',
      body: { system_id: systemId, ...dateRange },
    });
  },
};
